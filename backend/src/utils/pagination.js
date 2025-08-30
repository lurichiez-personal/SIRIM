function paginate(array, page = 1, pageSize = 20) {
  const total = array.length;
  const pages = Math.ceil(total / pageSize);
  const items = array.slice((page - 1) * pageSize, page * pageSize);
  return { items, page, pageSize, total, pages };
}

module.exports = { paginate };
