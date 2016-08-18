var HashMap = require('hashmap');
var express = require('express'), app = express(), http = require('http'), server = http.createServer(app);
var fs = require('fs');
var bodyParser = require("body-parser");
var mysql = require('mysql');
var nodemailer = require('nodemailer');
var connection = mysql.createConnection(
{
    host : 'localhost', //localhost
    port : 3306, user : 'root', password : 'kys5522', //kys5522
    database : 'mailer' 
});
//커넥션 정의
var ip_index = 0;
var ip_list = new HashMap();
var host = '';
var transport = nodemailer.createTransport("SMTP", {
    host : ''
});
//SMTP 정의
var mailOptions = {
    from : '', to : '', subject : '', html : ''
};
//메일 옵션 정의
var sender = '' //보내는 사람
var recvAddr = [];
//받는 사람 목록
var subject = '';
//제목
var to = '';
//받는 사람 post
var content = '';
//본문
var err_list = ['421 4.3.2'];
function loadIP() 
{
    var sql = 'SELECT ip FROM ip_list';
    //ip db에서 ip를 불러옴
    var temp = '';
    connection.query(sql, function (error, data) 
    {
        if (error) {
            console.log(error);
        }
        else 
        {
            sql = mysql.format("SELECT block_msg FROM ip_list");
            connection.query(sql, function (error, rows) 
            {
                if (error) {
                    console.log(error);
                }
                else 
                {
                    for (var i = 0; i <= data.length - 1; i++) 
                    {
                        temp = JSON.parse(rows[i].block_msg);
                        //해당 ip의 차단된 도메인 배열
                        ip_list.set(data[i].ip, temp);
                        //ip 테이블의 key 추가
                        console.log(ip_list.keys()[i]);
                    }
                    console.log('ip = ' + ip_list.get('223.130.121.107'));
                    host = ip_list.keys()[0];
                    transport = nodemailer.createTransport("SMTP", {
                        host : host 
                    });
                    //SMTP 정의
                }
            });
        }
    });
    //connection.query
}
function isBlock(ip, domain) 
{
    //해당 ip에서 해당 도메인이 차단되었으면 true
    var temp = ip_list.get(ip);
    console.log(temp);
    if (temp.indexOf(domain) == - 1) {
        return false;
    }
    else {
        return true;
    }
}
function delBlock(ip, domain) 
{
    //해당 ip에서 차단된 도메인 제거
    if (isBlock(ip, domain) == true) 
    {
        var temp = ip_list.get(ip);
        console.log(temp);
        temp.splice(temp.indexOf(domain), 1);
        ip_list.set(ip, temp);
        inserts = [JSON.stringify(temp), ip];
        sql = mysql.format("UPDATE ip_list SET block_msg = ? WHERE ip = ?", inserts);
        connection.query(sql, function (error) 
        {
            if (error) {
                console.log(error);
            }
            else {
                console.log('db에 차단 기록 삭제됨');
            }
        });
        //connection.query
    }
    else {
        console.log('error - 존재하지 않는 도메인');
    }
}
function setBlock(ip, domain) 
{
    //해당 ip에서 차단된 도메인 등록
    if (isBlock(ip, domain) == false) 
    {
        var temp = ip_list.get(ip);
        temp.push(domain);
        inserts = [JSON.stringify(temp), ip];
        sql = mysql.format("UPDATE ip_list SET block_msg = ? WHERE ip = ?", inserts);
        connection.query(sql, function (error) 
        {
            if (error) {
                console.log(error);
            }
            else {
                console.log('db에 차단 기록 추가됨');
            }
        });
        //connection.query
    }
    else {
        console.log('error - 이미 존재하는 도메인');
    }
}
app.use(bodyParser.urlencoded({
    extended : false 
}));
app.use(bodyParser.json());
app.get('/', function (req, res) 
{
    res.sendfile(__dirname + '/Mailer.html');
});
app.post('/view', function (req, res) 
{
    console.log(req.body.id);
    var inserts = req.body.id;
    sql = mysql.format("SELECT * FROM mail_log WHERE request_id = ?", inserts);
    connection.query(sql, function (error, rows) 
    {
        if (error) {
            console.log(error);
            res.send('오류');
        }
        else {
            console.log(rows);
            res.send(rows);
        }
    });
    //connection.query
});
app.post('/cview', function (req, res) 
{
    console.log(req.body.id);
    var inserts = req.body.id;
    sql = mysql.format("SELECT * FROM mail_content WHERE request_id = ?", inserts);
    connection.query(sql, function (error, rows) 
    {
        if (error) {
            console.log(error);
            res.send('오류');
        }
        else {
            console.log(rows);
            res.send(rows);
        }
    });
    //connection.query
});
app.post('/send', function (req, res) 
{
    if (req.body.mailto == '') {
        res.send('받는 사람을 입력해주세요.') 
    }
    else 
    {
        sender = req.body.sender;
        subject = req.body.mailsub;
        to = req.body.mailto content = req.body.content;
        res.send('발송 요청 하였습니다. 발송 목록에서 상태를 확인할 수 있습니다.');
        sendMail();
    }
});
app.post('/load', function (req, res) 
{
    var inserts = req.body.mail;
    sql = mysql.format("SELECT * FROM mail WHERE user_id = ?", inserts);
    connection.query(sql, function (error, rows) 
    {
        if (error) {
            console.log(error);
            res.send('오류');
        }
        else {
            console.log(rows);
            res.send(rows);
        }
    });
    //connection.query
});
function sendMail() 
{
    dataSplit(smtpSet);
    //dataSplit을 호출하고 smtpSet 콜백
}
function dataSplit(callback) 
{
    recvAddr = to.split(',');
    // ,로 구분된 받는 사람 이메일 목록을 배열에 담기
    callback();
    // smtpSet 호출
}
function smtpSet() 
{
    var inserts = ['test@testing3.com', recvAddr.length, '0'];
    sql = mysql.format("INSERT INTO mail (user_id, mail_count, state) VALUES (?, ?, ?)", inserts);
    connection.beginTransaction(function (err) 
    {
        if (err) {
            console.log('transaction error');
        }
        connection.query(sql, function (error, result, fields) 
        {
            if (error) 
            {
                connection.rollback(function () 
                {
                    console.log('rollback error');
                });
                console.log(error);
            }
            else 
            {
                console.log(result.insertId);
                inserts = [result.insertId, subject, content];
                sql = mysql.format("INSERT INTO mail_content (request_id, subject, content) VALUES (?, ?, ?)", 
                inserts);
                connection.query(sql, function (error, result, fields) 
                {
                    //메일 전송 로그 기록
                    if (error) 
                    {
                        connection.rollback(function () 
                        {
                            console.log('rollback error');
                        });
                        console.log(error);
                    }
                    else 
                    {
                        connection.commit(function (err) 
                        {
                            if (err) {
                                console.log(err);
                                connection.rollback(function () 
                                {
                                    console.log('rollback error');
                                });
                            }
                            console.log('success');
                        });
                        //connection.commit
                    }
                });
                //connection.query
                fr = sender;
                sendRequest(fr, recvAddr, subject, content, 0, result.insertId, [], '');
            }
        });
        //connection.query
    });
    //beginTransaction
}
//function end
function sendRequest(fr, data, sub, cont, count, idx, bdata, rdomain) 
{
    //sendRequest(보내는 이, 받는 이(배열), 제목, 내용, 시작할 인덱스, 차단된 주소배열)
    var fail_data = bdata;
    var sql = "INSERT INTO mail_log (request_id, sender_address, reciver_address, mail_code) VALUES (?, ?, ?, ?)";
    console.log(data[count]);
    if (data[count]) {
        var domain = data[count].split('@')[1];
    }
    mailOptions = {
        from : fr, to : data[count], subject : sub, html : cont 
    };
    //메일 설정
    transport.sendMail(mailOptions, function (error, response) 
    {
        //메일 발송 요청
        if (error) 
        {
            console.log(error);
            var inserts = [idx, mailOptions.from, data[count], error.message];
            sql = mysql.format(sql, inserts);
            connection.query(sql, function (error, result, fields) 
            {
                //메일 전송 로그 기록
                if (error) {
                    console.log(error);
                }
                else {
                    console.log('DB 작성 완료') 
                }
            });
        }
        else 
        {
            code = response.message;
            //if (Math.floor(Math.random() * 3) == 2) code = '421 4.3.2'; //에러 유발 테스트
            console.log('메일 전송 >> 결과: ' + response.message);
            var inserts = [mailOptions.from, data[count], code];
            sql = mysql.format(sql, inserts);
            if (rdomain != domain) 
            {
                for (var i = err_list.length - 1; i >= 0; i--) 
                {
                    if (code.substring(0, 9) == err_list[i]) 
                    {
                        console.log('차단 응답이 도착하였습니다.');
                        setBlock(host, domain);
                        //차단 등록
                        fail_data.push(data[count]);
                        rdomain = domain;
                        break;
                    }
                    else {
                        delBlock(host, domain);
                        break;
                    }
                }
            }
            else 
            {
                fail_data.push(data[count]);
                count++;
                return sendRequest(fr, data, sub, cont, count, idx, fail_data, rdomain);
            }
            connection.query(sql, function (error, result, fields) 
            {
                if (error) {
                    console.log(error);
                }
                else {
                    console.log('DB 작성 완료');
                }
            });
        }
        count++;
        if (data.length > count) {
            return sendRequest(fr, data, sub, cont, count, idx, fail_data, rdomain);
        }
        else if (fail_data.length != 0) 
        {
            //실패한 데이터가 있으면
            if ((ip_index + 1) == ip_list.keys().length) {
                ip_index = 0;
            }
            else {
                ip_index++;
            }
            host = ip_list.keys()[ip_index];
            transport.host = host;
            console.log('변경한 ip : ' + host);
            return sendRequest(fr, fail_data, sub, cont, 0, idx, [], rdomain);
        }
    });
}
server.listen(80);
loadIP();
