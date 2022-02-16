var express = require('express');
var router = express.Router();
var path = require('path');
const fileUpload = require('express-fileupload');
const multer = require('multer');
const  storage = multer.diskStorage({
    destination: './public/images',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
var pg =require('pg');
var config = {
    user: 'meiogwic', //env var: PGUSER
    database: 'meiogwic', //env var: PGDATABASE
    password: 'J4d5VLUv-owaKaaff11XC308QxW4nKI-', //env var: PGPASSWORD
    host: 'tyke.db.elephantsql.com', // Server hosting the postgres database
    port: 5432, //env var: PGPORT
    max: 100, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};
var pool = new pg.Pool(config);
/*router.use(fileUpload({

}))*/

const upload = multer({
    storage: storage,
})


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express', files : '' });
});
router.get('/welcome', function(req, res, next) {
    res.render('welcome');
});
router.post('/image',
    upload.array('images', 5),
    function (req, res, next) {
        console.info(req.files);
        /* upload(req, res, (err) => {
           if(err) {
             res.sendStatus(404);
           }
           else {
             console.info(req.file.filename);
             res.render('index', {title: 'image', file: `images/${req.file.filename}`})
           }
         })*/
        console.info(req.files.filename);
        res.render('index', { title: 'images', files: req.files });

    })

router.post('/upload', function(req, res) {

    let sampleFile;
    let uploadPath;

    if(!req.files || Object.keys(req.files).length ===0 ){
        return res.sendStatus(400).send("nije ucitana slika");
    }
    sampleFile = req.files.sampleFile;
    uploadPath = __dirname + '/../public/images/' + sampleFile.name
    //use mv()
    sampleFile.mv(uploadPath,function (err){
        if(err) return res.status(500).send(err);

        pool.connect(function(err,client,done){
            if(err){
                res.end('{"error" : "Error", "status" : 500');
            }

            client.query(`insert into slika (slika) values ($1);`,
                [
                    sampleFile.name
                ],
                function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        res.sendStatus(200);
                    }
                })
        })


    });

});

router.get('/slika', async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from slika`,
            [], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.slika = result.rows;
                    console.log(req.slika[0].slika);
                    res.render('slika', {
                        slika:req.slika
                    });
                }
            })
    })
});
module.exports = router;