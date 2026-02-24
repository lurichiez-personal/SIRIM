import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, storage } from '../firebase.ts';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAlertStore } from './useAlertStore.ts';

interface Plan {
  price: number;
}

interface MarketingState {
  plans: {
    basico: Plan;
    pro: Plan;
    premium: Plan;
  };
  landingImageUrls: string[];
  subscribeToMarketingContent: () => () => void;
  updatePlanPrice: (plan: 'basico' | 'pro' | 'premium', price: number) => Promise<void>;
  addLandingImage: (file: File) => Promise<void>;
  removeLandingImage: (url: string) => Promise<void>;
}

const marketingDocRef = doc(db, 'marketing', 'content');

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set) => ({
        plans: {
            basico: { price: 25 },
            pro: { price: 45 },
            premium: { price: 75 },
        },
        landingImageUrls: [],

        subscribeToMarketingContent: () => {
            const unsub = onSnapshot(marketingDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    set({ 
                        landingImageUrls: data.landingImageUrls || [],
                        plans: data.plans || { basico: { price: 25 }, pro: { price: 45 }, premium: { price: 75 } }
                    });
                } else {
                    // Initialize the document if it doesn't exist
                    setDoc(marketingDocRef, { landingImageUrls: [], plans: { basico: { price: 25 }, pro: { price: 45 }, premium: { price: 75 } } });
                }
            },
            (error) => {
                console.error("Marketing content listener failed:", error);
                // Fail silently, as the app can function without this global marketing data.
                // This prevents a permission error here from crashing other data listeners.
            });
            return unsub;
        },

        updatePlanPrice: async (plan, price) => {
            const docSnap = await getDoc(marketingDocRef);
            if (docSnap.exists()) {
                const currentPlans = docSnap.data().plans;
                const updatedPlans = {
                    ...currentPlans,
                    [plan]: { price },
                };
                await updateDoc(marketingDocRef, { plans: updatedPlans });
            }
        },

        addLandingImage: async (file) => {
            const storageRef = ref(storage, `marketing/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                await updateDoc(marketingDocRef, {
                    landingImageUrls: arrayUnion(downloadURL)
                });
            } catch (error) {
                console.error("Error uploading image:", error);
                useAlertStore.getState().showAlert('Error de Carga', 'No se pudo subir la imagen.');
            }
        },
        
        removeLandingImage: async (url) => {
            try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
                await updateDoc(marketingDocRef, {
                    landingImageUrls: arrayRemove(url)
                });
            } catch (error) {
                console.error("Error deleting image:", error);
                // If deletion from storage fails, still try to remove from Firestore list
                 if (error.code !== 'storage/object-not-found') {
                    useAlertStore.getState().showAlert('Error de Borrado', 'No se pudo eliminar el archivo de imagen, pero se quitó de la lista.');
                 }
                 await updateDoc(marketingDocRef, {
                    landingImageUrls: arrayRemove(url)
                });
            }
        }
    }),
    {
        name: 'sirim-marketing-storage',
    }
));