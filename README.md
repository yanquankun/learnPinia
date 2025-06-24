_这是个人学习Pinia的fork仓库，已删除多余代码，只保留pinia源码以及测试包_

> 目录介绍
>
> > packages/pinia：pinia源码  
> > packages/playground 调试包

#### 调试方式

- 如果你是在个人的工作空间中运行的项目，复制.vscode目录中launch.json的以下代码到工作空间中的.vscode目录中launch.json的`configurations`字段中

```json
{
  "name": "调试pinia",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173/demo-counter",
  "webRoot": "${workspaceFolder}",
  "sourceMaps": true,
  "trace": true,
  "skipFiles": ["<node_internals>/**"]
}
```

注意：url为playground项目的本地地址，如果你有其他的地址配置，请更新为新的地址

- 如果你是在非个人空间中运行的项目，那么直接在项目根目录中的.vscode的launch.json进行如上配置即可

#### 安装依赖

```bash
pnpm ci
```

#### 项目启动

```bash
pnpm play
```

#### 项目打包

```bash
pnpm build
```

`附官方地址：`

[Pinia Git介绍](https://github.com/vuejs/pinia)

[Pinia 官网介绍](https://pinia.vuejs.org/zh/introduction.html)
