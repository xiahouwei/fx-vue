// 排序函数 把keyOrder内的每个元素排在首位
module.exports = function sortObject (obj, keyOrder, dontSortByUnicode) {
  if (!obj) return
  const res = {}

  if (keyOrder) {
    keyOrder.forEach(key => {
      res[key] = obj[key]
      delete obj[key]
    })
  }

  const keys = Object.keys(obj)

  !dontSortByUnicode && keys.sort()
  keys.forEach(key => {
    res[key] = obj[key]
  })

  return res
}
