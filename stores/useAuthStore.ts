
import { create } from 'zustand';
import { User, Role } from '../types.ts';
import { useTenantStore } from './useTenantStore.ts';
import { useDataStore } from './useDataStore.ts';
import { auth, db, getSecondaryAuth } from '../firebase.ts';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  OAuthProvider,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAlertStore } from './useAlertStore.ts';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  forcePasswordChange: boolean;
  logout: () => Promise<void>;
  triggerMicrosoftLogin: () => Promise<boolean>;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    nombreEmpresa: string;
    rnc: string;
    nombreUsuario: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  getUsersForTenant: (empresaId: string) => Promise<User[]>;
  addUser: (userData: Omit<User, 'id'>, password: string) => Promise<void>;
  updateUser: (userData: User, password?: string) => Promise<void>;
  deleteUser: (user: User) => Promise<void>;
  changePassword: (password: string) => Promise<boolean>;
  clearForcePasswordChangeFlag: () => Promise<void>;
  updateCurrentUserProfile: (data: { nombre?: string; password?: string; photoURL?: string }) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      forcePasswordChange: false,

      logout: async () => {
        await signOut(auth);
      },

      triggerMicrosoftLogin: async () => {
        try {
            const provider = new OAuthProvider('microsoft.com');
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;
            
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
               const newEmpresaRef = doc(collection(db, 'empresas'));
               await setDoc(newEmpresaRef, {
                   nombre: `${firebaseUser.displayName}'s Company`,
                   rnc: '000000000',
               });

               const newUser: Omit<User, 'id'> = {
                   nombre: firebaseUser.displayName || 'Usuario Microsoft',
                   email: firebaseUser.email!,
                   roles: [Role.Admin],
                   empresaId: newEmpresaRef.id,
                   authMethod: 'microsoft',
                   activo: true,
               };
               await setDoc(userDocRef, newUser);
            }
            return true;
        } catch(error) {
            console.error("Microsoft login error:", error);
            useAlertStore.getState().showAlert('Error de Inicio de Sesión', 'No se pudo iniciar sesión con Microsoft.');
            return false;
        }
      },

      loginWithPassword: async (email, password) => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            await signOut(auth);
            console.error("Login error: User profile not found in Firestore.");
            return false;
          }

          const userData = userDocSnap.data() as User;
          if (!userData.activo) {
            await signOut(auth);
            console.error("Login error: User account is inactive.");
            return false;
          }
          return true;
        } catch (error) {
          console.error("Login error:", error);
          return false;
        }
      },
      
      changePassword: async (password: string) => {
        if (auth.currentUser) {
            try {
                await updatePassword(auth.currentUser, password);
                if (get().forcePasswordChange) {
                    await get().clearForcePasswordChangeFlag();
                }
                return true;
            } catch (error) {
                console.error("Error updating password:", error);
                return false;
            }
        }
        return false;
      },
      
      clearForcePasswordChangeFlag: async () => {
        const user = get().user;
        if (user) {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, { tempPassword: false });
          set(state => ({ 
            forcePasswordChange: false,
            user: state.user ? { ...state.user, tempPassword: false } : null,
          }));
        }
      },

      register: async (data) => {
        const { nombreEmpresa, rnc, nombreUsuario, email, password } = data;
        try {
            const newEmpresaRef = doc(collection(db, 'empresas'));
            await setDoc(newEmpresaRef, {
                nombre: nombreEmpresa,
                rnc: rnc,
            });

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            const newUser: Omit<User, 'id'> = {
                nombre: nombreUsuario,
                email: email,
                roles: [Role.Admin],
                empresaId: newEmpresaRef.id,
                authMethod: 'local',
                activo: true,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            return true;
        } catch (error: any) {
            console.error("Registration error:", error);
            let message = 'Ocurrió un error durante el registro.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Este correo electrónico ya está en uso.';
            }
            useAlertStore.getState().showAlert('Error de Registro', message);
            return false;
        }
      },

      getUsersForTenant: async (empresaId: string) => {
        const q = query(collection(db, 'users'), where('empresaId', '==', empresaId));
        const querySnapshot = await getDocs(q);
        const users: User[] = [];
        querySnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() } as User);
        });
        return users;
      },

      addUser: async (userData, password) => {
        const secondaryAuth = getSecondaryAuth();
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
          const uid = userCredential.user.uid;
          
          await setDoc(doc(db, 'users', uid), { 
            ...userData, 
            tempPassword: true
          });

          await signOut(secondaryAuth);
          
          useAlertStore.getState().showAlert('Usuario Creado', `El usuario ${userData.nombre} ha sido creado con una contraseña temporal. Deberá cambiarla en su primer inicio de sesión.`);

        } catch (error: any) {
            console.error("Error creating user:", error);
            let message = 'Ocurrió un error al crear el usuario.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Este correo electrónico ya está en uso por otro usuario.';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña debe tener al menos 6 caracteres.';
            }
            useAlertStore.getState().showAlert('Error de Creación', message);
        }
      },

      updateUser: async (userData, password) => {
        const { id, ...dataToUpdate } = userData;
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, dataToUpdate);

        if (password) {
          console.warn("La actualización de contraseña desde el panel de administración no es segura en el lado del cliente y requiere que el usuario se vuelva a autenticar. Para producción, esta operación debe realizarse a través de un backend con el SDK de administrador de Firebase.");
        }
      },

      deleteUser: async (user: User) => {
        const userRef = doc(db, 'users', user.id);
        await deleteDoc(userRef);
      },

      updateCurrentUserProfile: async (data) => {
        const currentUser = get().user;
        const firebaseUser = auth.currentUser;
        if (!currentUser || !firebaseUser) return false;
        
        const updates: Partial<User> = {};
        if (data.nombre && data.nombre !== currentUser.nombre) {
            updates.nombre = data.nombre;
        }
        if (data.photoURL && data.photoURL !== currentUser.photoURL) {
            updates.photoURL = data.photoURL;
        }

        try {
            if (data.password) {
                await get().changePassword(data.password);
            }
            
            if (Object.keys(updates).length > 0) {
                const userRef = doc(db, 'users', currentUser.id);
                await updateDoc(userRef, updates);
                set({ user: { ...currentUser, ...updates } });
            }
            
            return true;
        } catch (error) {
            console.error("Error updating profile:", error);
            useAlertStore.getState().showAlert('Error', 'No se pudo actualizar el perfil.');
            return false;
        }
      },
    })
);

onAuthStateChanged(auth, async (firebaseUser) => {
    try {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as User;
                if (userData.activo) {
                    useAuthStore.setState({
                        isAuthenticated: true,
                        user: { ...userData, id: firebaseUser.uid },
                        forcePasswordChange: userData.tempPassword === true
                    });
                    
                    await useTenantStore.getState().fetchAvailableTenants();
                    
                    useAuthStore.setState({ isLoading: false });

                } else {
                    await signOut(auth);
                    useAlertStore.getState().showAlert('Cuenta Inactiva', 'Su cuenta de usuario ha sido desactivada.');
                }
            } else {
                 await signOut(auth);
                 useAlertStore.getState().showAlert('Error de Perfil', 'Su perfil de usuario no se encontró en la base de datos. Por favor, contacte al administrador.');
            }
        } else {
            useAuthStore.setState({ isAuthenticated: false, user: null, isLoading: false, forcePasswordChange: false });
            useTenantStore.getState().clearTenants();
            useDataStore.getState().clearData();
        }
    } catch (error) {
        console.error("Error during authentication state change:", error);
        useAlertStore.getState().showAlert('Error de Conexión', 'No se pudo conectar con la base de datos para verificar el usuario.');
        await signOut(auth);
        useAuthStore.setState({ isAuthenticated: false, user: null, isLoading: false, forcePasswordChange: false });
    }
});
