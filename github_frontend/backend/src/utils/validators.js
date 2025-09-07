function requireFields(body, fields) {
for (const f of fields) {
if (body[f] === undefined || body[f] === null || body[f] === "") {
const err = new Error(`Campo requerido: ${f}`);
err.status = 400;
throw err;
}
}
}


module.exports = { requireFields };