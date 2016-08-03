var ip_index = 0;
var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app);
var fs = require('fs');
var bodyParser = require("body-parser");
var mysql = require('mysql');
var nodemailer = require('nodemailer');
var host = JSON.parse(fs.readFileSync('host_info.json', 'utf8'));
var connection = mysql.createConnection({
	host:'localhost', //localhost
	port: 3306,
	user: 'root',
	password: 'kys5522', //kys5522
	database: 'mailer' 
}); //커넥션 정의
var transport = nodemailer.createTransport("SMTP", {
    host: host.ip_list[ip_index]
}); //SMTP 정의
var mailOptions = {
	from: '',
	to: '',
	subject: '',
	html: ''
}; //메일 옵션 정의
var sender = '' //보내는 사람
var recvAddr = []; //받는 사람 목록
var subject = ''; //제목
var to = ''; //받는 사람 post
var content = ''; //본문
var req_id; //요청 id

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/Mailer.html');
});

app.post('/send', function(req, res) {
	if (req.body.mailto == '') {
		res.send('받는 사람을 입력해주세요.')
	} else {
		sender = req.body.sender;
		subject = req.body.mailsub;
		to = req.body.mailto
		content = req.body.content;
		res.send('발송 요청 하였습니다. 발송 목록에서 상태를 확인할 수 있습니다.');
		sendMail();
	}
});

function ipChange() {
	if (ip_index + 1 == host.ip_list.length) {
		ip_index = 0;
	} else {
		ip_index++;
	}
	transport.close();
	transport = nodemailer.createTransport("SMTP", {
	    host: host.ip_list[ip_index]
	}); //SMTP 정의
	console.log('변경한 ip : ' + host.ip_list[ip_index]);
}

function sendMail() {
	console.log('제목 : ' + subject);
	console.log('내용 : ' + content);
	dataSplit(smtpSet); //dataSplit을 호출하고 콜백함수로 smtpSet를 지정
}

function dataSplit(callback) {
	console.time('split_time');
	recvAddr = to.split(','); // ,로 구분된 받는 사람 이메일 목록을 배열에 담기
	console.timeEnd('split_time');
	callback(); // smtpSet 호출
}

function smtpSet() {
	console.time('read_time');
	var sql = "INSERT INTO mail (user_id, mail_count, state) VALUES (?, ?, ?)";
	var inserts = ['test@testing.com', recvAddr.length, '0'];
	sql = mysql.format(sql, inserts);
	connection.query(sql, function (error, result, fields) {
    //메일 전송 로그 기록
    if (error) {
    	console.log(error);
    	console.log('쿼리문에 오류가 있습니다.');
    } else {
    	console.timeEnd('read_time');
    	req_id = result.insertId;
    	sendRequest(0);
    }

	});
}

function sendRequest(count) {
	console.time('sending_time');
	var sql = "INSERT INTO mail_log (request_id, sender_address, reciver_address, mail_subject, mail_content, mail_code) VALUES (?, ?, ?, ?, ?, ?)";
	//Prepared Statement 사용
	mailOptions = {
		from: 'test@testing2.com',
		to: recvAddr[count],
		subject: subject,
		html: content
	}; //메일 설정

	transport.sendMail(mailOptions, function(error, response) {
	//메일 발송 요청
	if (error) {
		console.log(error);
		var inserts = [req_id, mailOptions.from, recvAddr[count], subject, content, error.message];
		sql = mysql.format(sql, inserts);
		connection.query(sql, function (error, result, fields) {
    	//메일 전송 로그 기록
    		if (error) {
    		    console.log(error);
    		    console.log('쿼리문에 오류가 있습니다.');
    		} else {
    			console.log('DB 작성 완료')
    		    console.timeEnd('sending_time');
    		}
		});
	} else {
		code = response.message.substring(0, 9);
		//if (Math.floor(Math.random() * 3) == 2) code = '421 4.3.2';
		console.log('메일 전송 >> 요청 받은 횟수: ' + recvAddr.length + ' 보내는 메일 주소: ' + mailOptions.from + ' 결과: ' + response.message);
		var inserts = [req_id, mailOptions.from, recvAddr[count], subject, content, code];
		sql = mysql.format(sql, inserts);
		if (code == '421 4.3.2') {
			console.log('차단 응답이 도착하여 IP를 변경하며, 해당 메일부터 재전송합니다.');
			ipChange();
			return sendRequest(count);
		}
		connection.query(sql, function (error, result, fields) {
    	//메일 전송 로그 기록
    		if (error) {
    		    console.log(error);
    		    console.log('쿼리문에 오류가 있습니다.');
    		} else {
    			console.log('DB 작성 완료')
    		}
		});
		}

	count++;

	if (recvAddr.length > count) {
		sendRequest(count);
	} else {
		transport.close();
	}

	});

	console.timeEnd('sending_time');
}

server.listen(80);

