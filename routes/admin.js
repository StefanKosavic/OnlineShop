var express = require('express');
var router = express.Router();
const {autorizacijaAdmina}=require("./autorizacija");
const multer = require('multer');
const path = require('path');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
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

const storage = multer.diskStorage({
    destination: './public/images',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({
    storage: storage
})
/* GET home page. */

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});
router.get('/login', function(req, res, next) {
    res.render('admin/login', { title: 'Express' });
});

router.post('/login', async function(req, res, next) {

    var korisnik = {
        username: req.body.username,
        sifra: req.body.sifra,
    };

    pool.connect(function(err,client,done){
        if(err){
            res.render('admin/greska',{poruka:"Pogresan username ili sifra"});
        }
        client.query(`SELECT * FROM main_admin where username=$1`,[korisnik.username],async function (err,result){
            done();
            if(err){
                console.info(err);
                res.render('admin/greska',{poruka:"Pogresan username ili sifra"});
            }else{
                if(result.rows.length === 0){
                    res.render('admin/greska',{poruka:"Pogresan username ili sifra"});
                }else{
                    console.info(result.rows);
                    let kriptoSifra = result.rows[0].sifra;
                    console.log("Ovo je prava sifra " + korisnik.sifra);
                    console.log("Ovo je kripto sifra " + kriptoSifra);
                    if(await bcrypt.compare(korisnik.sifra,kriptoSifra)){
                        res.korisnik = {
                            ime: result.rows[0].ime,
                            prezime: result.rows[0].prezime,
                            username: result.rows[0].username,
                        }
                       // let token = jwt.sign(res.korisnik,'admin');
                        //res.cookie('token_admin',token);
                        //console.log(token);
                        req.session.admin = korisnik.username;
                        res.redirect('/admin/home');
                    }
                    else{
                        console.info("Losa sifra!");
                        res.render('admin/greska',{poruka:"Pogresan username ili sifra"});
                    }
                }
            }
        })
    })
});


router.get('/home',
    autorizacijaAdmina,
    function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT * FROM trgovine where status='aktivan'`,[],function (err,result){
            done();
            if(err){
                console.info(err);
                res.sendStatus(500);
            }else{
                req.trgovine = result.rows;
                next();
            }
        })
    })
});

router.get('/home', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT * FROM kupci where status='aktivan'`,[],function (err,result){
            done();
            if(err){
                console.info(err);
                res.sendStatus(500);
            }else{
                req.kupci = result.rows;
                res.render('admin/home',
                    {trgovine:req.trgovine,
                            kupci:req.kupci
                    });
            }
        })
    })
});
router.post('/home/trgovine/:status/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`Update trgovine set status=$1 where id_trgovine=$2`,[req.params.status,
            req.params.id],
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

router.post('/home/kupci/:status/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`Update kupci set status=$1 where id_kupca=$2`,[req.params.status,
                req.params.id],
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

router.delete('/home/trgovine/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`delete from trgovine where id_trgovine=$1`,[
                req.params.id],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});

router.delete('/home/kupci/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`delete from kupci where id_kupca=$1`,[
                req.params.id],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});

router.get('/statistika',
    autorizacijaAdmina,
    function(req, res, next) {
    pool.connect(function (err, client, done) {
        if (err) {
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT count(*) as trgovine FROM trgovine`, [], function (err, result) {
            done();
            if (err) {
                console.info(err);
                res.sendStatus(500);
            } else {
                req.trgovine = result.rows;
                console.log(req.trgovine);
                next();
            }
        })
    })
});

router.get('/statistika',
    function(req, res, next) {
    pool.connect(function (err, client, done) {
        if (err) {
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT count(*) as kupci FROM kupci`, [], function (err, result) {
            done();
            if (err) {
                console.info(err);
                res.sendStatus(500);
            } else {
                req.kupci = result.rows;
                console.log(req.kupci);
                next();
            }
        })
    })
});

router.get('/statistika',
    function(req, res, next) {
    pool.connect(function (err, client, done) {
        if (err) {
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT count(*) as artikli FROM artikli`, [], function (err, result) {
            done();
            if (err) {
                console.info(err);
                res.sendStatus(500);
            } else {
                req.artikli = result.rows;
                console.log(req.artikli);
                next();
            }
        })
    })
});

router.get('/statistika',
    function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT count(*) as narudzbe FROM narudzbe`,[],function (err,result){
            done();
            if(err){
                console.info(err);
                res.sendStatus(500);
            }else{
                req.narudzbe = result.rows;
                console.log(req.narudzbe);
                res.render('admin/statistika', {
                    trgovine:req.trgovine,
                    kupci: req.kupci,
                    artikli: req.artikli,
                    narudzbe: req.narudzbe,
                });
            }
        })
    })
});

router.get('/crud',autorizacijaAdmina,
    function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli`,
            [],function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikli = result.rows;
                    console.log(req.artikli);
                    next();
                }
            })
    })
});
router.get('/crud',autorizacijaAdmina,
    function(req, res, next) {
        pool.connect(function(err,client,done){
            if(err){
                res.end('{"error" : "Error", "status" : 500');
            }
            client.query(`select * from trgovine`,
                [],function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        req.trgovine = result.rows;
                        next();
                    }
                })
        })
    });

router.get('/crud',
    async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from kategorije`,
            [], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.kategorije = result.rows;
                    console.log(req.kategorije);
                    res.render('admin/crud', {
                        kategorije:req.kategorije,
                        artikli:req.artikli,
                        trgovine:req.trgovine
                    });
                }
            })
    })
});

router.post('/dodajArtikal', async function(req, res, next) {
    var  artikal =  {
        naziv: req.body.naziv,
        opis: req.body.opis,
        cijena: req.body.cijena,
        kategorija: req.body.kategorija,
        id_trgovine: req.body.trgovina
    };

    let sampleFile;
    let uploadPath;

    if(!req.files || Object.keys(req.files).length ===0 ){
        return res.sendStatus(400).send("nije ucitana slika");
    }
    sampleFile = await req.files.sampleFile;
    uploadPath = __dirname + '/../public/images/' + sampleFile.name
    //use mv()
    await sampleFile.mv(uploadPath,async function (err){
        if(err)  return res.status(500).send(err);

        pool.connect(function(err,client,done){
            if(err){
                res.end('{"error" : "Error", "status" : 500');
            }
            console.log(sampleFile.name + "  OVO JE SLIKAA");
            client.query(`insert into artikli (naziv,opis,kategorija,cijena,slika,id_trgovine) values ($1,$2,$3,$4,$5,$6);`,
                [
                    artikal.naziv,
                    artikal.opis,
                    artikal.kategorija,
                    artikal.cijena,
                    sampleFile.name,
                    artikal.id_trgovine
                ],
                function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        res.redirect('crud');
                    }
                })
        })
    })
});

router.post('/crud/:naziv_kategorije', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`insert into kategorije (naziv) values ($1);`,
            [
                req.params.naziv_kategorije,

            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/updateKategoriju/:naziv_kategorije/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update kategorije set naziv=$1 where id_kategorije=$2;`,
            [
                req.params.naziv_kategorije,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/updateArtikal/:naziv_artikla/:opis_artikla/:kategorija_artikla/:cijena_artikla/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update artikli 
        set naziv=$1,
            opis=$2,
            kategorija=$3,
            cijena=$4
        where id_artikla=$5;`,

            [
                req.params.naziv_artikla,
                req.params.opis_artikla,
                req.params.kategorija_artikla,
                req.params.cijena_artikla,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});

router.delete('/deleteKategoriju/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`delete from kategorije where id_kategorije=$1`,
            [
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }

            })
    })
});

router.delete('/deleteArtikal/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`delete from artikli where id_artikla=$1`,
            [
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }

            })
    })
});

router.post('/slika', upload.single('slika'),async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        console.info(req.file)
        client.query(`insert into slika(slika) values ($1)`,

            [
                slike
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    res.sendStatus(200)
                }
            })
    })
});




module.exports = router;
