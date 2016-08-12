var HashMap = require('hashmap');
var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app);
var fs = require('fs');
var bodyParser = require("body-parser");
var mysql = require('mysql');
var nodemailer = require('nodemailer');
var connection = mysql.createConnection({
	host:'localhost', //localhost
	port: 3306,
	user: 'root',
	password: 'kys5522', //kys5522
	database: 'mailer' 
}); //커넥션 정의
var ip_index = 0;
var ip_list = new HashMap();
var host = '';
var transport = nodemailer.createTransport("SMTP", {
    host: ''
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

function loadIP() {
	var sql = 'SELECT ip FROM ip_list'; //ip db에서 ip를 불러옴
	var temp = '';
	connection.query(sql, function(error, data) {
    if (error) {
    	console.log(error);
    	console.log('쿼리문에 오류가 있습니다.');
    } else {
    	sql = mysql.format("SELECT block_msg FROM ip_list");
    	connection.query(sql, function(error, rows) {
    		if (error) {
    			console.log(error);
    		} else {
    			for (var i = 0; i <= data.length - 1; i++) {
    				temp = JSON.parse(rows[i].block_msg); //해당 ip의 차단된 도메인 배열
    				ip_list.set(data[i].ip, temp); //ip 테이블의 key 추가
    				console.log(ip_list.keys()[i]);
    			}
    			console.log('ip = ' + ip_list.get('223.130.121.107'));
    			host = ip_list.keys()[0];
    			transport = nodemailer.createTransport("SMTP", {
    				host: host
				}); //SMTP 정의
    		}
    	});
   	}
});
}

function isBlock(ip, domain) {
	//해당 ip에서 해당 도메인이 차단되었으면 true
	var temp = ip_list.get(ip);
	console.log(temp);
	if (temp.indexOf(domain) == -1) {
		return false;
	} else {
		return true;
	}
}

function delBlock(ip, domain) {
	//해당 ip에서 차단된 도메인 제거
	if (isBlock(ip, domain) == true) {
		var temp = ip_list.get(ip);
		console.log(temp);
		temp.splice(temp.indexOf(domain), 1);
		ip_list.set(ip, temp);
    	inserts = [JSON.stringify(temp), ip];
    	sql = mysql.format("UPDATE ip_list SET block_msg = ? WHERE ip = ?", inserts);
    	connection.query(sql, function(error) {
    	if (error) {
    		console.log(error);
    	} else {
    		console.log('db에 차단 기록 삭제됨');
    	}
		});
	} else {
		console.log('error - 존재하지 않는 도메인');
	}

}

function setBlock(ip, domain) {
	//해당 ip에서 차단된 도메인 등록
	if (isBlock(ip, domain) == false) {
		var temp = ip_list.get(ip);
		temp.push(domain);
	    inserts = [JSON.stringify(temp), ip];
	    sql = mysql.format("UPDATE ip_list SET block_msg = ? WHERE ip = ?", inserts);
	    connection.query(sql, function(error) {
    		if (error) {
    			console.log(error);
    		} else {
    			console.log('db에 차단 기록 추가됨');
    		}
		});
	} else {
		console.log('error - 이미 존재하는 도메인');
	}
}

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
	var inserts = ['test@testing.com', recvAddr.length, '0'];
	sql = mysql.format("INSERT INTO mail (user_id, mail_count, state) VALUES (?, ?, ?)", inserts);
	connection.query(sql, function (error, result, fields) {
    //메일 전송 로그 기록
    if (error) {
    	console.log(error);
    	console.log('쿼리문에 오류가 있습니다.');
    } else {
    	console.timeEnd('read_time');
    	fr = sender;
    	sendRequest(fr, recvAddr, subject, content, 0, []);
    }

    var inserts = [subject, content];
	sql = mysql.format("INSERT INTO mail_content (subject, content) VALUES (?, ?)", inserts);
	connection.query(sql, function (error, result, fields) {
    //메일 전송 로그 기록
    if (error) {
    	console.log(error);
    	console.log('쿼리문에 오류가 있습니다.');
    } else {
    	console.log('success');
    }

	});
});
}

function sendRequest(fr, data, sub, cont, count, bdata) {
	//sendRequert(보내는 이, 받는 이(배열), 제목, 내용, 시작할 인덱스, 차단된 주소배열)
	console.time('sending_time');
	var fail_data = bdata;
	var sql = "INSERT INTO mail_log (sender_address, reciver_address, mail_code) VALUES (?, ?, ?)";
	//Prepared Statement 사용
	mailOptions = {
		from: fr,
		to: data[count],
		subject: sub,
		html: cont
	}; //메일 설정

	transport.sendMail(mailOptions, function(error, response) {
	//메일 발송 요청
	if (error) {
		console.log(error);
		var inserts = [mailOptions.from, data[count], error.message];
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
		code = response.message;
		if (Math.floor(Math.random() * 3) == 2) code = '421 4.3.2'; //에러 유발 테스트
		console.log('메일 전송 >> 요청 받은 횟수: ' + data.length + ' 보내는 메일 주소: ' + mailOptions.from + ' 결과: ' + response.message);
		var inserts = [mailOptions.from, data[count], code];
		sql = mysql.format(sql, inserts);
		if (code.substring(0, 9) == '421 4.3.2') {
			console.log('차단 응답이 도착하였습니다.');
			domain = data[count].split('@')[1];
			setBlock(host, domain); //차단 등록
			fail_data.push(data[count]);
			//return sendRequest(count);
		} else {
			domain = data[count].split('@')[1];
			delBlock(host, domain);
		}
		connection.query(sql, function (error, result, fields) {
    	//메일 전송 로그 기록
    		if (error) {
    		    console.log(error);
    		    console.log('쿼리문에 오류가 있습니다.');
    		} else {
    			console.log('DB 작성 완료');
    		}
		});
		}

	count++;

	if (data.length > count) {
		sendRequest(fr, data, sub, cont, count, fail_data);
	} else if (fail_data.length != 0) { //실패한 데이터가 있으면
		if ((ip_index + 1) == ip_list.keys().length) {
			ip_index = 0;
		} else {
			ip_index++;
		}
		host = ip_list.keys()[ip_index];
		transport.host = host;
		console.log('변경한 ip : ' + host);
		sendRequest(fr, fail_data, sub, cont, 0, []);
	}

	});

	console.timeEnd('sending_time');
}

server.listen(80);
loadIP();
