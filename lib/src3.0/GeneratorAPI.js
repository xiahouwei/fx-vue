const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const resolve = require('resolve')
const isBinary = require('isbinaryfile')
const { getPluginLink, toShortPluginId } = require('@vue/cli-shared-utils')

const isString = val => typeof val === 'string'
const isFunction = val => typeof val === 'function'
const isObject = val => val && typeof val === 'object'
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))

class GeneratorAPI {
	/**
	 * @param {string} id - Id of the owner plugin
	 * @param {Generator} generator - The invoking Generator instance
	 * @param {object} options - generator options passed to this plugin
	 * @param {object} rootOptions - root options (the entire preset)
	 */
	constructor (id, generator, options, rootOptions) {
		this.id = id
		this.generator = generator
		this.options = options
		this.rootOptions = rootOptions

		this.pluginsData = generator.plugins
			.filter(({ id }) => id !== `@vue/cli-service`)
			.map(({ id }) => ({
				name: toShortPluginId(id),
				link: getPluginLink(id)
			}))

		this._entryFile = undefined
	}

	/**
	 * 判断项目中是否有某个插件
	 *
	 * @param {string} id - Plugin id, can omit the (@vue/|vue-|@scope/vue)-cli-plugin- prefix
	 * @return {boolean}
	 */
	hasPlugin (id) {
		return this.generator.hasPlugin(id)
	}

	// 拓展 package.json 配置
	extendPackage (fields) {
		const pkg = this.generator.pkg
		const toMerge = isFunction(fields) ? fields(pkg) : fields
		for (const key in toMerge) {
			const value = toMerge[key]
			const existing = pkg[key]
			if (isObject(value) && (key === 'dependencies' || key === 'devDependencies')) {
				if (!existing) {
					pkg[key] = value
				} else {
					pkg[key] = Object.assign(existing, value)
				}
			} else if (!(key in pkg)) {
				pkg[key] = value
			} else if (Array.isArray(value) && Array.isArray(existing)) {
				pkg[key] = mergeArrayWithDedupe(existing, value)
			} else if (isObject(value) && isObject(existing)) {
				pkg[key] = merge(existing, value, { arrayMerge: mergeArrayWithDedupe })
			} else {
				pkg[key] = value
			}
		}
	}

	/**
	 * 解析模板渲染data
	 *
	 * @private
	 */
	_resolveData (additionalData) {
		return Object.assign({
		options: this.options,
		rootOptions: this.rootOptions,
		plugins: this.pluginsData
		}, additionalData)
	}

	/**
	 * 注入文件中间件
	 * Inject a file processing middleware.
	 *
	 * @private
	 * @param {FileMiddleware} middleware - A middleware function that receives the
	 *   virtual files tree object, and an ejs render function. Can be async.
	 */
	_injectFileMiddleware (middleware) {
		this.generator.fileMiddlewares.push(middleware)
	}

	// 向文件当中注入import语法的方法
	injectImports (file, imports) {
		const _imports = (
			this.generator.imports[file] ||
			(this.generator.imports[file] = new Set())
		)
		;(Array.isArray(imports) ? imports : [imports]).forEach(imp => {
			_imports.add(imp)
		})
	}

	// 向 Vue 根实例中添加选项
	injectRootOptions (file, options) {
		const _options = (
			this.generator.rootOptions[file] ||
			(this.generator.rootOptions[file] = new Set())
		)
		;(Array.isArray(options) ? options : [options]).forEach(opt => {
			_options.add(opt)
		})
	}

	resolve (_path) {
		return path.resolve(this.generator.context, _path)
	}

	get entryFile () {
		if (this._entryFile) return this._entryFile
		return (this._entryFile = fs.existsSync(this.resolve('src/main.ts')) ? 'src/main.ts' : 'src/main.js')
	}
	
	get invoking () {
		return this.generator.invoking
	}

	/**
	 * 使用ejs进行渲染
	 * Render template files into the virtual files tree object.
	 *
	 * @param {string | object | FileMiddleware} source -
	 *   Can be one of:
	 *   - relative path to a directory;
	 *   - Object hash of { sourceTemplate: targetFile } mappings;
	 *   - a custom file middleware function.
	 * @param {object} [additionalData] - additional data available to templates.
	 * @param {object} [ejsOptions] - options for ejs.
	 */
	render (source, additionalData = {}, ejsOptions = {}) {
		// 获取公共路径 可以返回调用render函数的文件所在路径
		const baseDir = extractCallDir()
		source = path.resolve(baseDir, source)
		// 注入文件中间件
		this._injectFileMiddleware(async (files) => {
			// 获取ejs渲染data
			const data = this._resolveData(additionalData)
			// 通过路径获取模板文件
			const globby = require('globby')
			const _files = await globby(['**/*'], { cwd: source })
			// 获取文件内容, 填充files
			for (const rawPath of _files) {
				const sourcePath = path.resolve(source, rawPath)
				const content = renderFile(sourcePath, data, ejsOptions)
				// 是Buffer实例 开头非空白,换行,缩进等无效字符
				if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
					files[rawPath] = content
				}
			}
		})
	}
}

function renderFile (name, data, ejsOptions) {
	// 如果二进制文件则直接读取文件
	if (isBinary.sync(name)) {
		return fs.readFileSync(name)
	}
	const template = fs.readFileSync(name, 'utf-8')
	const yaml = require('yaml-front-matter')
	const parsed = yaml.loadFront(template)
	const content = parsed.__content
	let finalTemplate = content.trim() + `\n`
	return ejs.render(finalTemplate, data, ejsOptions)
}

// 提取调用api.render()的本地路径 非常好的一个captureStackTrace非典型使用的例子
function extractCallDir () {
	// extract api.render() callsite file location using error stack
	const obj = {}
	// 返回调用堆栈信息
	Error.captureStackTrace(obj)
	const callSite = obj.stack.split('\n')[3]
	//  callSite 解析为 at module.exports (D:\xxxx\16_fx-vue-cli\lib\src3.0\plugins\cli-service\generator\index.js:3:9)
	const fileName = callSite.match(/\s\((.*):\d+:\d+\)$/)[1]
	return path.dirname(fileName)
  }

module.exports = GeneratorAPI