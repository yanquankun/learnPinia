// 从 rootStore 文件中导入 Pinia、PiniaPlugin、setActivePinia 和 piniaSymbol
import { Pinia, PiniaPlugin, setActivePinia, piniaSymbol } from './rootStore'
// 从 vue 库中导入 ref、App、markRaw、effectScope 和 Ref
import { ref, App, markRaw, effectScope, Ref } from 'vue'
// 从 devtools 文件中导入 registerPiniaDevtools 和 devtoolsPlugin
import { registerPiniaDevtools, devtoolsPlugin } from './devtools'
// 从 env 文件中导入 IS_CLIENT 常量，用于判断是否在客户端环境
import { IS_CLIENT } from './env'
// 从 types 文件中导入 StateTree 和 StoreGeneric 类型
import { StateTree, StoreGeneric } from './types'

/**
 * 创建一个供应用程序使用的 Pinia 实例
 */
export function createPinia(): Pinia {
  // 创建一个可停止的 effect scope，用于管理副作用
  const scope = effectScope(true)
  // 注意：这里我们可以检查 window 对象中的状态，并直接设置它
  // 如果在 Vue 3 SSR 中有类似的情况
  // 在 effect scope 中运行一个函数，创建一个响应式的状态对象
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  // 用于存储 Pinia 插件的数组
  let _p: Pinia['_p'] = []
  // 存储在调用 app.use(pinia) 之前添加的插件
  let toBeInstalled: PiniaPlugin[] = []

  // 创建一个 Pinia 实例
  const pinia: Pinia = markRaw({
    /**
     * 安装 Pinia 插件到 Vue 应用程序中
     * @param app - Vue 应用程序实例
     */
    install(app: App) {
      // 这允许在安装 pinia 插件后，在组件 setup 外部调用 useStore()
      setActivePinia(pinia)
      // 将 Vue 应用程序实例保存到 Pinia 实例中
      pinia._a = app
      // 通过 provide 方法将 Pinia 实例注入到应用程序中
      app.provide(piniaSymbol, pinia)
      // 将 Pinia 实例添加到全局属性中，以便在组件中可以通过 this.$pinia 访问
      app.config.globalProperties.$pinia = pinia
      /* istanbul ignore else */
      // 如果启用了开发工具并且在客户端环境中
      if (__USE_DEVTOOLS__ && IS_CLIENT) {
        // 注册 Pinia 开发工具
        registerPiniaDevtools(app, pinia)
      }
      // 将之前存储的待安装插件添加到插件数组中
      toBeInstalled.forEach((plugin) => _p.push(plugin))
      // 清空待安装插件数组
      toBeInstalled = []
    },

    /**
     * 为 Pinia 实例添加插件
     * @param plugin - 要添加的插件
     * @returns 返回 Pinia 实例，支持链式调用
     */
    use(plugin) {
      // 如果 Pinia 实例还未安装到应用程序中
      if (!this._a) {
        // 将插件添加到待安装插件数组中
        toBeInstalled.push(plugin)
      } else {
        // 否则，直接将插件添加到插件数组中
        _p.push(plugin)
      }
      return this
    },

    // 存储插件的数组
    _p,
    // 这里实际上是 undefined
    // @ts-expect-error
    // 存储 Vue 应用程序实例的属性
    _a: null,
    // 存储 effect scope 的属性
    _e: scope,
    // 存储所有 store 的 Map
    _s: new Map<string, StoreGeneric>(),
    // 存储 Pinia 状态的响应式对象
    state,
  })

  // Pinia 开发工具依赖于仅在开发环境中的特性，因此除非使用 Vue 的开发版本，否则不能强制启用。避免旧浏览器（如 IE11）。
  // 如果启用了开发工具，在客户端环境中且支持 Proxy
  if (__USE_DEVTOOLS__ && IS_CLIENT && typeof Proxy !== 'undefined') {
    // 使用开发工具插件
    pinia.use(devtoolsPlugin)
  }

  return pinia
}

/**
 * 通过停止 Pinia 实例的 effect scope 并移除状态、插件和存储来销毁 Pinia 实例。
 * 这在测试中非常有用，无论是使用测试用的 Pinia 还是常规的 Pinia，以及在使用多个 Pinia 实例的应用程序中。
 * 一旦销毁，Pinia 实例将不能再使用。
 *
 * @param pinia - Pinia 实例
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
  // @ts-expect-error: 无效赋值
  // 将存储 Vue 应用程序实例的属性置为 null
  pinia._a = null
}
