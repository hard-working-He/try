/**
 * 初始化所有的全局变量和全局方法
 */
const initGlobal = require('./global');
initGlobal();
/**
 * 引入app并启动服务
 */
const app = require('./app/app');
app.use(require('express').static('./dist'));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
console.log('程序开始执行');
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// 中间的代码...

console.log('程序执行到这里');


// 后续的代码...