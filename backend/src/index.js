require("dotenv").config();
const app = require("./app");
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`SIRIM API escuchando en :${PORT}`));