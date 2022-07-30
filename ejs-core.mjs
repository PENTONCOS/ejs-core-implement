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