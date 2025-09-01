function toInt(v, d) {
const n = parseInt(v, 10);
return Number.isFinite(n) && n > 0 ? n : d;
}


function buildPaging(req, defPage = 1, defSize = 10) {
const page = toInt(req.query.page, defPage);
const pageSize = toInt(req.query.pageSize, defSize);
const skip = (page - 1) * pageSize;
const take = pageSize;
return { page, pageSize, skip, take };
}


module.exports = { buildPaging };