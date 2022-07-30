import ejs from './ejs-core.mjs';

let data = {
  userInfo: {
    name: 'jiapandong',
    sex: '男',
    age: 18,
    hobby: 'football'
  }
}

let template = ejs.renderFile("./template.html", data)
console.log('template', template)