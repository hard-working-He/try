module.exports = {
  Login,
  Logout,
  Register,
};
const jwt = require('jsonwebtoken');
const secretKey = 'xWbiNA3FqnK77MnVCj5CAcfA-VlXj7xoQLd1QaAme6l_t0Yp1TdHbSw';
let { RespUserOrPassErr, RespUserAlreadyLoggedIn, RespParamErr, RespServerErr, RespUserExitErr, RespUpdateErr, RespUserNotExitErr } = require('../../model/error');
const { RespData, RespSuccess ,RespError} = require('../../model/resp');
const { Query } = require('../../db/query');
const crypto = require('crypto'); 
/**
 * 登录基本逻辑
 * 1.获取到前端传来的username和password
 * 2.查询数据库,判断用户名和密码是否正确
 * 3.正确后生成jwt,并返回想要token给前端去保存
 */
async function Login(req, res) {
    const { username, password } = req.body
    if (!(username && password)) {
        return RespError(res, RespParamErr)
    }
    //const salt = crypto.randomBytes(3).toString('hex')
    
    const sql = 'select * from user where username=?'
    let { err, results } = await Query(sql, [username])
    // 查询数据失败
    if (err) return RespError(res, RespServerErr)
    // 查询数据成功
    // 注意：如果执行的是 select 查询语句，则执行的结果是数组
    if (results.length != 0) {
        const payload = {
            id: results[0].id,
            avatar: results[0].avatar,
            username: results[0].username,
            password: results[0].password,
            name: results[0].name,
            phone: results[0].phone,
            salt: results[0].salt
        }
        //加盐
        let M = payload.salt.slice(0, 3) + password + payload.salt.slice(3);
        // 将M进行MD5哈希，得到哈希值
        let hash = crypto.createHash('md5').update(M).digest('hex');
        if (hash != payload.password) {
            return RespError(res, RespUserOrPassErr)
        }
        const token = jwt.sign(payload, secretKey, {expiresIn: '2w' });
        let data = {
            token: token,
            info: {
                id: results[0].id,
                avatar: results[0].avatar,
                username: results[0].username,
                name: results[0].name,
                phone: results[0].phone,
                created_at: new Date(results[0].created_at).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
                signature: results[0].signature,
            }
        }
        return RespData(res, data)
    }
    return RespError(res, RespUserOrPassErr)
}
/**
 * 退出登录基本逻辑
 * 1.获取到前端传来的username
 * 2.删除redis中的token
 * 3.返回成功
 */
async function Logout(req, res) {
    const { username } = req.body
    if (!username) {
        return RespError(res, RespParamErr)
    }
    return RespSuccess(res)
}
/**
 * 注册的基本逻辑
 * 1.获取到前端传来的username和password
 * 2.先判断用户名是否已经注册
 * 3.未注册则插入user表中
 * 4.给新用户添加一个好友分组
 * 5.生成jwt,把token返回给前端要前端进行保存 
 */
async function Register(req, res) {
    const { username, password,avatar } = req.body
    if (!(username && password)) {
        return RespError(res, RespParamErr)
    }
    //3个字节的字节码转化成16进制字符串，生成一个6位的salt
    const salt = crypto.randomBytes(3).toString('hex')
    const sql = 'select username,password from user where username=?'
    //判断用户名是否已注册
    let { err, results } = await Query(sql, [username])
    // 查询数据失败
    if (err) return RespError(res, RespServerErr)
    // 查询数据成功
    // 注意：如果执行的是 select 查询语句，则执行的结果是数组
    if (results.length != 0) {
        return RespError(res, RespUserExitErr)
    }
    //加盐
    let M = salt.slice(0, 3) + password + salt.slice(3);
    // 将M进行MD5哈希，得到哈希值
    let hash = crypto.createHash('md5').update(M).digest('hex');
    let user = {
        avatar,
        username: username,
        password: hash,
        name: username,
        phone: "",
        signature: "",
        salt: salt
    }
    const sql3 = 'insert into user set ?'
    let { err: err3, results: results3 } = await Query(sql3, user)
    // 执行 SQL 语句失败了
    if (err3) return RespError(res, RespServerErr)
    // 注册成功后将相关信息返回给前端
    if (results3.affectedRows === 1) {
        getUserInfo(username, (info) => {
            let friend_group = {
                user_id: info.id,
                username: username,
                name: "我的好友",
            }
             //创建一个新的默认分组("我的好友"")
            let sql4 = 'insert into friend_group set ?'
            db.query(sql4, friend_group, (err, results) => {
                const payload = {
                    id: info.id,
                    avatar: info.avatar,
                    username: info.username,
                    name: info.name,
                    phone: info.phone,
                }
                const token = jwt.sign(payload, secretKey);
                let data = {
                    token: token,
                    info: info
                }
                return RespData(res, data)
            })
        })
    }
}
/**
 * 获取用户信息
 * @param {*} username
 * @param {*} callback
 * @returns
 * @description 通过用户名获取用户信息
 */
function getUserInfo(username, callback) {
    const sql = 'select * from user where username=?'
    db.query(sql, [username], (err, results) => {
        // 注意：如果执行的是 select 查询语句，则执行的结果是数组
        if (results.length != 0) {
            const data = {
                id: results[0].id,
                avatar: results[0].avatar,
                username: results[0].username,
                name: results[0].name,
                phone: results[0].phone,
                created_at: new Date(results[0].created_at).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
                signature: results[0].signature,
            }
            return callback(data)
        }
    })
}