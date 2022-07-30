# ejs-core-implement
ejs模版编译引擎核心实现
# 原理分析
博客地址：[实现ejs模版引擎核心能力](https://blog.csdn.net/Pentoncos/article/details/126072474)

## 前言
前段时间搭建了一个[图标的通用库](https://blog.csdn.net/Pentoncos/article/details/123806065?spm=1001.2014.3001.5501)，当时为了解决上百图标组件的批量输出，利用了脚本+模版的方法去自动化创建组件。突然想到能否自己去模仿一个模版引擎的能力，于是我以`ejs`为例来做如下实现。

Github 项目地址：[https://github.com/PENTONCOS/ejs-core-implement](https://github.com/PENTONCOS/ejs-core-implement)

## 简单介绍
>模板引擎(用于 Web 开发)是为了使用户界面与业务数据(内容)分离而产生的，它可以生成特定格式的文档，用于网站的模板引擎就会生成一个标准的 HTML 文档。模板引擎核心可以总结为两点: 模板文件、数据。

## ejs实现
`ejs` 使用 `<%` 和 `%>` 作为标识，本文实现两种常用的 `ejs` 语法:

- `<% script %>` 脚本执行，用于流程控制，无输出
- `<%= value %>` 输出表达式的值，输出会发生 HTML 转义

模板引擎的实现原理其实就是字符串拼接，模板引擎本质上也是基于字符串拼接进行实现。但具体实现思路会有两种:**数组 + join实现**和**纯字符串拼接**模式。本文基于**字符串拼接**进行实现。

### 获取文件信息
首先来搭建一下 `ejs` 的基本框架：
- 以 `html` 文件作为模板，因此需借助 `node` 中的 `fs` 模块来读取 `html` 文件。
- 利用`fs.readFileSync`来同步的获取文件信息。

```js
const ejs = {
  renderFile: (filename, data) => {
    // 获取模版文件信息
    let content = fs.readFileSync(filename, "utf-8");
  }
}
```

### <%= 语法实现

`./template.html` 模板内容如下，当利用 `ejs` 传入 `userInfo.name` 和 `userInfo.sex` 数据时，对应的替换模板内容。

```js
// ./template.html
<body>
  <div>姓名: <%=userInfo.name%></div>
  <div>性别: <%=userInfo.sex%></div>
</body>
```

遇到格式非常类似的字符串，很容易会想到正则，因此我们可以对读取的文件数据做正则替换，但要注意正则默认是贪婪匹配模式。

正则实现 `/<%=(.+?)%>/g`，`.=?` 中的 `?` 设置非贪婪匹配模式。

>tips: 字符串方法中的 `replace` 方法非常强大，第一个参数可以是字符串或者正则，第二个参数可以是字符串或者每次匹配都要调用的回调函数。当两个参数分别为正则和回调函数时，正则中的子表达式(即`(content)`)可以与回调函数的参数一一对应。

```js
const ejs = {
  renderFile: (filename, data) => {
    // 获取模版文件信息
    let content = fs.readFileSync(filename, "utf-8");
    content = content.replace(/<%=(.+?)%>/g, function () {
      return "${" + arguments[1] + "}"
    });
  }
}
```

### <% 语法实现

`<% script %>` 脚本执行，用于流程控制，无输出。看下面例子:

```js
<body>
  <%Object.keys(userInfo).forEach(function(info){%>
  <span><%=userInfo[info]%></span>
  <% }); %>
</body>
```

`userInfo` 使用 `ejs` 模板引擎渲染后，`<% script %>` 会视为 `JavaScript` 脚本，因此等价于执行 `Object.keys(userInfo).forEach` 方法。

`<% script %>` 语法的核心在于转换为 `JavaScript` 脚本执行，而模板引擎的本质在于字符串拼接，因此问题可以转换为如何在 `JavaScript` 中执行代码字符串。

在不考虑 `nodejs` 中 `vm` `模块的前提下，JavaScript` 中有两种方案可以执行代码字符串:

- `eval` 函数
- `new Function()` 参考文章：[深入 JS new Function 语法](https://www.zhangxinxu.com/wordpress/2022/04/js-new-function/)

`MDN` 官方文档中如下描述 `eval`: **Never use eval()！** 此外还讲解了 eval 的缺点，例如执行慢，不安全等，最狠的还附带了下面这句话: Fortunately, there's a very good alternative to eval(): using the Function constructor

那么理所当然，优先选择 `Function()` 来实现代码字符串执行。

### 字符串拼接 + with Function

整体内容经过正则替换后，将头部和尾部加上对应字符串即可。

模板文件中通常不止会接收一种数据，例如下面的例子:

```js
<body>

  <div>姓名: <%=userInfo.name%></div>
  <div>性别: <%=userInfo.sex%></div>
  <div>年纪: <%=userInfo.age%></div>
  <div>爱好: <%=userInfo.hobby%></div>

  <%Object.keys(userInfo).forEach(function(info){%>
  <span><%=userInfo[info]%></span>
  <% }); %>

</body>
```

对于这种情况，按照我们的思路，首先进行字符串拼接，然后利用 `new Function` 将代码字符串转换成函数，执行函数。

```js
new Function("userInfo", templateStr);
```

`JavaScript` 的变量获取是基于作用域链的，如果当前作用域内没有该变量，会沿着作用域向上查找，直到查到或者到达作用域顶端。

那么有没有一种方案能给某块代码添加一层作用域呐？`with`语句可以将某个对象添加到作用域链的顶部。**虽然官方极度不推荐 `with` 的使用**

问题解决了，直接看代码。

```js
const ejs = {
  renderFile: (filename, data) => {
    // 获取模版文件信息
    let content = fs.readFileSync(filename, "utf-8");
    content = content.replace(/<%=(.+?)%>/g, function () {
      return "${" + arguments[1] + "}"
    });
    let header = 'let str = "";\n with(data){\n str+= `';
    let main = content.replace(/<%((.+?))%>/g, function () {
      return "`\n" + arguments[1] + "\n str+=`";
    });
    let footer = "`} \nreturn str";
    let fn = new Function('data', templateStr);

    return fn(data);
  }
}
```

## 总结
`ejs-core`实现完整代码如下：
```js
// ./ejs-core.mjs 

import fs from 'fs';
export default {
  renderFile: (filename, data) => {
    // 获取模版文件信息
    let content = fs.readFileSync(filename, "utf-8");
    content = content.replace(/<%=(.+?)%>/g, function () {
      return "${" + arguments[1] + "}"
    });
    let header = 'let str = "";\n with(data){\n str+= `';
    let main = content.replace(/<%((.+?))%>/g, function () {
      return "`\n" + arguments[1] + "\n str+=`";
    });
    let footer = "`} \nreturn str";
    let templateStr = header + main + footer;
    let fn = new Function('data', templateStr);

    return fn(data);
  }
}
```

虽然 `ejs` 代码实现并不多，但其中我们还是可以学习到很多小知识。

- 洞悉模板引擎的实现本质，即字符串拼接
- 使用 `with` 配合 `new Function` 实现 `<%` 语法
- `replace` 配合正则替换