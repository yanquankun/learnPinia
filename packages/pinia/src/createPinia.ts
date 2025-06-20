// 从 rootStore 文件中导入 Pinia、PiniaPlugin、setActivePinia 和 piniaSymbol
// - Pinia: Pinia 实例的接口定义
// - PiniaPlugin: 插件的接口定义
// - setActivePinia: 设置当前活动的 Pinia 实例
// - piniaSymbol: 用于 provide/inject 的 Symbol
import { Pinia, PiniaPlugin, setActivePinia, piniaSymbol } from './rootStore'
// 从 vue 库中导入 ref、App、markRaw、effectScope 和 Ref
// - ref: 创建响应式数据
// - App: Vue 应用实例类型
// - markRaw: 标记对象使其不被转为响应式
// - effectScope: 管理副作用的作用域
// - Ref: 响应式引用类型
import { ref, App, markRaw, effectScope, Ref } from 'vue'
// 从 devtools 文件中导入 registerPiniaDevtools 和 devtoolsPlugin
// - 用于集成 Vue DevTools 调试工具
import { registerPiniaDevtools, devtoolsPlugin } from './devtools'
// 从 env 文件中导入 IS_CLIENT 常量，用于判断是否在客户端环境
import { IS_CLIENT } from './env'
// 从 types 文件中导入 StateTree 和 StoreGeneric 类型
// - StateTree: 状态树的类型定义
// - StoreGeneric: 通用 store 的类型定义
import { StateTree, StoreGeneric } from './types'

/**
 * 创建一个供应用程序使用的 Pinia 实例
 *
 * 这个函数是 Pinia 的核心入口点，负责:
 * 1. 创建响应式状态容器
 * 2. 初始化插件系统
 * 3. 实现 Vue 插件接口
 * 4. 提供开发工具集成
 */
export function createPinia(): Pinia {
  // 创建一个可停止的 effect scope，用于管理副作用
  // effectScope 允许我们批量管理一组响应式副作用
  // 通过 scope.stop() 可以一次性停止所有副作用
  const scope = effectScope(true)

  // 在 effect scope 中运行一个函数，创建一个响应式的状态对象
  // 这个对象将存储所有 store 的状态
  // 使用 Record<string, StateTree> 类型表示这是一个键为字符串(store id)，值为状态树的对象
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  // 用于存储 Pinia 插件的数组
  let _p: Pinia['_p'] = []
  // 存储在调用 app.use(pinia) 之前添加的插件
  // 这样设计是为了支持在 Pinia 安装到应用前添加插件
  let toBeInstalled: PiniaPlugin[] = []

  // 创建一个 Pinia 实例
  // 使用 markRaw 确保 Pinia 实例本身不会被转为响应式
  // 因为 Pinia 实例包含许多不应该被响应式追踪的内部属性和方法
  const pinia: Pinia = markRaw({
    /**
     * 安装 Pinia 插件到 Vue 应用程序中
     * 这是 Vue 插件的标准 install 方法
     */
    install(app: App) {
      // 设置当前活动的 Pinia 实例
      // 这允许在组件 setup 外部调用 useStore()
      setActivePinia(pinia)

      // 保存 Vue 应用实例的引用
      pinia._a = app

      // 通过 provide 方法将 Pinia 实例注入到应用程序中
      // 这样所有组件都可以通过 inject(piniaSymbol) 获取 Pinia 实例
      app.provide(piniaSymbol, pinia)

      // 将 Pinia 实例添加到全局属性中
      // 兼容 Vue 2 的使用方式，允许通过 this.$pinia 访问
      app.config.globalProperties.$pinia = pinia

      // 如果启用了开发工具并且在客户端环境中
      if (__USE_DEVTOOLS__ && IS_CLIENT) {
        // 注册 Pinia 开发工具
        // 这使得可以在 Vue DevTools 中查看和调试 Pinia store
        registerPiniaDevtools(app, pinia)
      }

      // 安装所有在 app.use(pinia) 之前添加的插件
      toBeInstalled.forEach((plugin) => _p.push(plugin))
      // 清空待安装插件数组
      toBeInstalled = []
    },

    /**
     * 为 Pinia 实例添加插件
     * 支持链式调用，例如: pinia.use(plugin1).use(plugin2)
     */
    use(plugin) {
      // 如果 Pinia 实例还未安装到应用程序中
      // 将插件添加到待安装插件数组中
      if (!this._a) {
        toBeInstalled.push(plugin)
      } else {
        // 否则，直接将插件添加到插件数组中并执行
        _p.push(plugin)
      }
      return this
    },

    // 存储插件的数组
    _p,

    // 存储 Vue 应用程序实例的属性
    // 初始值为 null，在 install 方法中被赋值
    // @ts-expect-error
    _a: null,

    // 存储 effect scope 的属性
    // 用于后续的副作用管理和销毁
    _e: scope,

    // 存储所有 store 的 Map
    // 键为 store id，值为 store 实例
    _s: new Map<string, StoreGeneric>(),

    // 存储 Pinia 状态的响应式对象
    // 所有 store 的状态都会被存储在这里
    state,
  })

  // 如果启用了开发工具，在客户端环境中且支持 Proxy
  // 开发工具依赖 Proxy，所以需要检查浏览器支持情况
  if (__USE_DEVTOOLS__ && IS_CLIENT && typeof Proxy !== 'undefined') {
    // 使用开发工具插件
    // 这提供了时间旅行调试、状态快照等高级功能
    pinia.use(devtoolsPlugin)
  }

  return pinia
}

/**
 * 通过停止 Pinia 实例的 effect scope 并移除状态、插件和存储来销毁 Pinia 实例
 * 这在测试中非常有用，可以完全清理 Pinia 实例
 * 一旦销毁，Pinia 实例将不能再使用
 */
export function disposePinia(pinia: Pinia) {
  // 停止 effect scope，清除所有副作用
  pinia._e.stop()

  // 清空存储所有 store 的 Map
  pinia._s.clear()

  // 清空存储插件的数组
  pinia._p.splice(0)

  // 清空 Pinia 状态
  pinia.state.value = {}

  // 将存储 Vue 应用程序实例的属性置为 null
  // @ts-expect-error
  pinia._a = null
}
