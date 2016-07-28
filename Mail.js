var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app);
var bodyParser = require("body-parser");
var mysql = require('mysql');
var connection = mysql.createConnection({
	host:'localhost',
	port: 3306,
	user: 'root',
	password: 'kys5522',
	database: 'mailer'
});
var recvAddr = [];
var subject = '';
var to = '';
var content = '';
var nodemailer = require('nodemailer');
var transport = nodemailer.createTransport("SMTP", {
    host: '223.130.121.106'
});
var mailOptions = {
	from: 'test@testing.com',
	to: 'kiljuniver@naver.com',
	subject: 'Nodemailer 테스트',
	html: '평문 보내기 테스트 '
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/Mailer.html');
});

app.post('/send', function(req, res) {
  subject = req.body.mailsub;
  to = req.body.mailto
	content = req.body.content;
	res.send('성공하였습니다. 발송 목록에서 상태를 확인할 수 있습니다.');
	sendMail();
	});

var sendMail = function() {
	console.log('제목 : ' + subject);
  console.log('받는 사람 : ' + to);
  console.log('내용 : ' + content);
  dataSplit(smtpSet);
}

function dataSplit(callback) {
  recvAddr = to.split(',');
  callback(recvAddr, subject, content);
}

function smtpSet(data_to, data_sub, data_cot) {
	mailOptions = {
	from: 'test@testing.com',
	to: data_to[0],
	subject: data_sub,
	html: data_cot
};
	transport.sendMail(mailOptions, function(error, response) {
	if (error) {
		console.log(error);
	} else {
		console.log("Message sent : " + response.message);
		connection.query('select * from mail', function (error, result, fields) {
    if (error) {
        console.log(error);
        console.log('쿼리 문장에 오류가 있습니다.');
    } else {
        console.log(result);
        console.log('---------------')
        console.log(fields);
    }
	});
	}
	transport.close();
});

}

server.listen(80);

