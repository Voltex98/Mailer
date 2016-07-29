var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app);
var fs = require('fs');
var bodyParser = require("body-parser");
var mysql = require('mysql');
var nodemailer = require('nodemailer');
var host = fs.readFileSync('host_info.txt', 'utf8');
var connection = mysql.createConnection({
	host:'localhost',
	port: 3306,
	user: 'root',
	password: 'kys5522',
	database: 'mailer'
}); //커넥션 정의
var transport = nodemailer.createTransport("SMTP", {
    host: host
});
var mailOptions = {
	from: 'test@testing.com',
	to: 'kiljuniver@naver.com',
	subject: 'Nodemailer 테스트',
	html: '평문 보내기 테스트'
};
var recvAddr = [];
var subject = '';
var to = '';
var content = '';
var req_id;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/Mailer.html');
});

app.post('/send', function(req, res) {
  subject = req.body.mailsub;
  to = req.body.mailto
	content = req.body.content;
	res.send('발송 요청 하였습니다. 발송 목록에서 상태를 확인할 수 있습니다.');
	sendMail();
	});

var sendMail = function() {
	console.log('제목 : ' + subject);
  console.log('내용 : ' + content);
  dataSplit(smtpSet); //dataSplit을 호출하고 콜백으로 smtpSet를 호출
}

function dataSplit(callback) {
  recvAddr = to.split(','); // ,로 구분된 받는 사람 이메일 목록을 배열에 담기
  callback(recvAddr, subject, content); // smtpSet 호출
}

function smtpSet(data_to, data_sub, data_cot) {
		mailOptions = {
			from: 'test@testing.com',
			to: data_to[0],
			subject: data_sub,
			html: data_cot
		};

		connection.query("INSERT INTO mail (user_id,mail_count,state) VALUES ("+"'"+mailOptions.from+"'"+","+data_to.length+",0);", function (error, result, fields) {
    	//메일 전송 로그 기록
    if (error) {
        console.log(error);
        console.log('쿼리문에 오류가 있습니다.');
    } else {
        console.log(result);
        console.log('---------------')
        console.log(fields);
        connection.query("SELECT * FROM mail where id DESC limit 1;", function (error, result, fields) {
    			if (error) {
        		console.log(error);
        		console.log('쿼리문에 오류가 있습니다.');
    			} else {
        		console.log(result);
        		req_id = result;
    				}
					});
    		}
		});

		
	for (var i = 0; i < data_to.length; i++) {
		mailOptions = {
			from: 'test@testing.com',
			to: data_to[i],
			subject: data_sub,
			html: data_cot
		}; //메일 설정

	transport.sendMail(mailOptions, function(error, response) {
	if (error) {
		console.log(error);
	} else {
		console.log('메일 전송 시도 >> 요청 받은 횟수: ' + data_to.length + ' 보내는 메일 주소: ' + mailOptions.from + ' 결과: ' + response.message);
		code = response.message;
		connection.query("INSERT INTO mail_log (request_id, reciver_address, mail_subject, mail_content, mail_code) VALUES ("+req_id+", "+"'"+data_to[i]+"'"+", "+"'"+data_sub+"'"+", "+"'"+data_cot+"'"+", 250)",
			function (error, result, fields) {
    	//메일 전송 로그 기록
    if (error) {
        console.log(error);
        console.log('쿼리문에 오류가 있습니다.');
    } else {
        console.log(result);
        console.log('---------------')
        console.log(fields);
    		}
			});
		}
	});
}
	transport.close();
}

server.listen(80);

