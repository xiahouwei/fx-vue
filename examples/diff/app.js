import { h, Text, Fragment, render } from "../../node_modules/@fx-vue/vue/dist/vue.esm-bundler.js"

// const childrenList1 = Array.from({ length: 3 }, (_, i) => ({ id: i, name: i}))
// const childrenList2 = childrenList1.splice(5, 1)
// const childrenList2 = childrenList1.slice(0, 2)
// childrenList2.push({ id: 4, name: 4})
const list1 = ['a', 'b', 'c', 'd', 'e', 'f']
// const list1 = ['a', 'b', 'c', 'd', 'e']
// const list1 = ['a', 'b', 'c']
const list2 = ['a', 'd', 'b', 'c', 'g', 'f']
// [4, 2, 3, 0]
// [1, 2]
// const list2 = ['a', 'c', 'd', 'b', 'e']
// const list2 = ['b', 'c', 'a']
const childrenList1 = list1.map(item => ({ id: item, name: item }))
const childrenList2 = list2.map(item => ({ id: item, name: item }))
console.log(childrenList1)
console.log(childrenList2)

const app2 = h(
	"ul",
	{
		class: 'c',
		style: {
			border: '1px solid blue',
			fontSize: '24px'
		},
		onClick: () => console.log('click2'),
		id: 'foo2',
		checked: '',
		customer: false
	},
	childrenList2.map(item => h('li', { key: item.id }, item.name))
	// childrenList2.map(item => h('li', null, item.name))
)

export default h(
	"ul",
	{
		class: 'a b',
		style: {
			border: '1px solid red',
			fontSize: '14px'
		},
		onClick: () => {
			render(app2, document.querySelector('#root'))
		},
		id: 'foo1',
		checked: '',
		customer: false
	},
	childrenList1.map(item => h('li', { key: item.id }, item.name))
	// childrenList1.map(item => h('li', null, item.name))
)
