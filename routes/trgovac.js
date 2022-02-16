var express = require('express');
var router = express.Router();
const nodemailer = require("nodemailer");
const format = require('pg-format');
const fileUpload = require('express-fileupload');
const {autorizacijaTrgovca}=require("./autorizacija");
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

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'stefan.kosavic10@gmail.com', // generated ethereal user
        pass: 'vedran11', // generated ethereal password
    },tls: {
        rejectUnauthorized: false
    }
});

//LOGIN I REGISTER

/* GET home page. */
router.get('/register', function(req, res, next) {
    res.render('trgovac/register');
});

router.post('/register', async function(req, res, next) {

    const hashedPassword = await bcrypt.hash(req.body.sifra,10);

    var  korisnik =  {
        email: req.body.email,
        username: req.body.username,
        sifra: hashedPassword,
        naziv: req.body.naziv,
        grad: req.body.grad,
        adresa: req.body.adresa,
        adresa_gl: req.body.adresa_gl,
        telefon: req.body.telefon
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
    pool.connect(async function(err,client,done){
        if(!korisnik.email || !korisnik.username || !korisnik.sifra || !korisnik.naziv
            || !korisnik.grad || !korisnik.adresa || !korisnik.adresa_gl || !korisnik.telefon){
            res.render('trgovac/greskaRegister',{poruka:"Nijedno polje ne smije biti prazno"});
        } else{
          await client.query(`insert into trgovine (naziv,username,sifra,email,telefon,grad,adresa,adresa_gl,slika)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [korisnik.naziv,korisnik.username,korisnik.sifra,korisnik.email,
                    korisnik.telefon,korisnik.grad,korisnik.adresa,korisnik.adresa_gl,sampleFile.name],
                function (err,result){
                done();
                if(err){
                    res.render('trgovac/greskaRegister',{poruka:"Nijedno polje ne smije biti prazno"});
                }else{
                    res.render("trgovac/login")
                }
            })
        }

        })
    });
});

router.get('/login', function(req, res, next) {
    res.render('trgovac/login');
});

router.post('/login', async function(req, res, next) {

    var korisnik = {
        username: req.body.username,
        sifra: req.body.sifra,
    };

    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`SELECT * FROM trgovine where username=$1`,[korisnik.username],async function (err,result){
            done();
            if(err){
                console.info(err);
                res.sendStatus(500);
            }else{
                if(result.rows.length === 0){
                    res.render('trgovac/greska',{poruka:"Pogresan username ili sifra"});
                }else{
                    let kriptoSifra = result.rows[0].sifra;
                    if(await bcrypt.compare(korisnik.sifra,kriptoSifra)){
                        res.korisnik = {
                            id: result.rows[0].id_trgovine,
                            email: result.rows[0].email,
                            username: result.rows[0].username,
                            naziv: result.rows[0].naziv,
                            grad: result.rows[0].grad,
                            adresa: result.rows[0].adresa,
                            adresa_gl: result.rows[0].adresa_gl,
                            telefon: result.rows[0].telefon
                        }
                        /*let token = jwt.sign(res.korisnik,'trgovine');
                        res.cookie('token_trgovine',token);
                        console.log(token);
                        res.sendStatus(200);*/
                        req.session.id_trgovine = res.korisnik.id;
                        req.session.trgovac =res.korisnik.username;
                        req.session.naziv_trgovine = res.korisnik.naziv;
                        res.redirect('/trgovac/urediPodatke');
                    }
                    else{
                        return res.sendStatus(401);
                    }
                }
            }
        })
    })
});



//KRAJ LOGINA I REGISTERA

router.get('/urediPodatke', autorizacijaTrgovca, function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from trgovine where username=$1`,
            [req.session.trgovac], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.trgovina = result.rows;
                    res.render('trgovac/urediPodatke', {
                        trgovina:req.trgovina
                    });
                }
            })
    })
});

router.post('/podaci/:naziv/:email/:adresa/:adresa_gl/:grad/:telefon/:id',
    function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update trgovine 
        set naziv=$1,
            email=$2,
            adresa=$3,
            adresa_gl=$4,
            grad=$5,
            telefon=$6
        where id_trgovine=$7;`,
            [
                req.params.naziv,
                req.params.email,
                req.params.adresa,
                req.params.adresa_gl,
                req.params.grad,
                req.params.telefon,
                req.params.id
            ], function (err,result){
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

router.get('/artikli',autorizacijaTrgovca, function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    console.log(id_trgovine);
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli where id_trgovine=$1 order by katalog,izdvojen desc;`,
            [id_trgovine],function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikli = result.rows;
                    next();
                }
            })
    })
});

router.get('/artikli', async function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    let naziv = req.session.naziv_trgovine;
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
                    res.render('trgovac/artikli', {
                        artikli:req.artikli,kategorije:req.kategorije,id_trgovine,naziv
                    });
                }
            })
    })
});

router.post('/artikli', async function(req, res, next) {
    var  artikal =  {
        naziv: req.body.naziv,
        opis: req.body.opis,
        cijena: req.body.cijena,
        kategorija: req.body.kategorija,
    };

    let id_trgovine = req.session.id_trgovine;
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
                    id_trgovine
                ],
                function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        res.redirect('artikli');
                    }
                })
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
                else {
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
                else {
                    res.sendStatus(200);
                }

            })
    })
});

router.post('/dodajUKatalog/:vrijednost/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update artikli 
        set katalog=$1
        where id_artikla=$2;`,

            [
                req.params.vrijednost,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else {
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/izbaciIzKataloga/:vrijednost/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update artikli 
        set katalog=$1
        where id_artikla=$2;`,

            [
                req.params.vrijednost,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }
                else {
                    res.sendStatus(200);
                }
            })
    })
});

router.get('/katalog', async function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    let naziv = req.session.naziv_trgovine;
    console.log(id_trgovine);
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli where katalog='true' and id_trgovine=$1 order by izdvojen desc;`,
            [id_trgovine], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikli = result.rows;
                    res.render('trgovac/katalog', {
                        artikli:req.artikli, id_trgovine, naziv
                    });
                }
            })
    })
});

router.get('/narudzbe', autorizacijaTrgovca, async function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    let naziv = req.session.naziv_trgovine;
    console.log(id_trgovine);
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select k.ime,k.prezime,k.email,k.slika,n.status,n.id_narudzbe
                      from kupci k,narudzbe n where k.id_kupca = n.id_kupca and n.id_trgovine=$1 order by n.status desc;`,
            [id_trgovine], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.narudzbe = result.rows;
                    console.log("Narudzbeee" + result.rows);
                    res.render('trgovac/narudzbe', {
                        narudzbe:req.narudzbe
                    });
                }
            })
    })
});

router.get('/narudzbe/posebniArtikli/:id_narudzbe', autorizacijaTrgovca, async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli
                    inner join korpa_narudzbe kn on artikli.id_artikla = kn.id_artikla
                    inner join narudzbe n on artikli.id_trgovine = n.id_trgovine
                    where n.id_narudzbe = $1;`,
            [req.params.id_narudzbe],
            function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikliNarudzbe = result.rows;
                    console.log(req.artikliNarudzbe.length);
                    res.render('trgovac/narudzbePosebniArtikli', {
                        artikliNarudzbe:req.artikliNarudzbe
                    });
                }
            })
    })
});


router.post('/prihvatiNarudzbu/:id_narudzbe/:email', function(req, res, next) {
    let status = "prihvacena";
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update narudzbe 
        set status=$1
        where id_narudzbe=$2;`,

            [
                status,
                req.params.id_narudzbe
            ],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }
                else{
                    let mailOptions = {
                        from: 'stefan.kosavic10@gmail.com', // sender address
                        to: req.params.email, // list of receivers
                        subject: "Prihvacena narudzba", // Subject line
                        text: "Ovim putem Vas obavjestavamo, da je Vasa narudzba prihvacena i da se priprema za isporuku", // plain text body

                    };

                    transporter.sendMail(mailOptions,function(error,info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("Email je poslan" + info.response);
                        }
                    });
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/odbijNarudzbu/:id_narudzbe/:email', function(req, res, next) {
    let status = "odbijena";
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update narudzbe 
        set status=$1
        where id_narudzbe=$2;`,

            [
                status,
                req.params.id_narudzbe
            ],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }
                else{
                    let mailOptions = {
                        from: 'stefan.kosavic10@gmail.com', // sender address
                        to: req.params.email, // list of receivers
                        subject: "Odbijena narudzba", // Subject line
                        text: "Ovim putem Vas obavjestavamo, da je Vasa narudzba nazalost odbijena usljed nemogucnosti isporuke artikala zbog trenutne situacije s COVID-19.", // plain text body

                    };

                    transporter.sendMail(mailOptions,function(error,info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("Email je poslan" + info.response);
                        }
                    });
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/isporuciNarudzbu/:id_narudzbe/:email', function(req, res, next) {
    let status = "isporucena";
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update narudzbe 
        set status=$1
        where id_narudzbe=$2;`,
            [
                status,
                req.params.id_narudzbe
            ],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }
                else{
                    let mailOptions = {
                        from: 'stefan.kosavic10@gmail.com', // sender address
                        to: req.params.email, // list of receivers
                        subject: "Isporucena narudzba", // Subject line
                        text: "Ovim putem Vas obavjestavamo, da je Vasa narudzba isporucena i trebala bi da stigne u narednih nekoliko dana.", // plain text body

                    };

                    transporter.sendMail(mailOptions,function(error,info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("Email je poslan" + info.response);
                        }
                    });
                    res.sendStatus(200);
                }
            })
    })
});


router.get('/katalog/zaKupca/:id_trgovine/:naziv', async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli where katalog='true' and id_trgovine=$1 order by izdvojen desc;`,
            [req.params.id_trgovine], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikli = result.rows;
                    res.render('trgovac/katalogNovi', {
                        artikli:req.artikli, id_trgovine:req.params.id_trgovine, naziv:req.params.naziv
                    });
                }
            })
    })
});


router.get('/katalog/:sortirani',  async function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    let naziv = req.session.naziv_trgovine;
    let poCemuSortira = req.params.sortirani;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        else if(poCemuSortira==="naziv"){
              client.query(`select * from artikli where katalog='true' and id_trgovine=$1 order by naziv`,
                [id_trgovine], async function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                       req.artikli = result.rows;
                       await res.render('trgovac/katalogNovi', {
                            artikli:req.artikli, id_trgovine, naziv
                        });
                    }
                })
        }
        else if(poCemuSortira==="cijena"){
            client.query(`select * from artikli where katalog='true' and id_trgovine=$1 order by cijena COLLATE "numeric"  desc;`,
                [id_trgovine], async function (err,result){
                    await done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        req.artikli = result.rows;
                        //POPRAVI NAKON SORTA UCITAVANJE SLIKE
                        console.log(req.artikli[0].slika + "Evo slikeee");
                        res.render('trgovac/katalogNovi', {
                            artikli:req.artikli, id_trgovine, naziv
                        });
                    }
                })
        }
        else if(poCemuSortira==="kategorija"){
            client.query(`select * from artikli where katalog='true' and id_trgovine=$1 order by kategorija`,
                [id_trgovine], function (err,result){
                    done();
                    if(err){
                        console.info(err);
                        res.sendStatus(500);
                    }else{
                        req.artikli = result.rows;
                        console.log(req.artikli.slika + "Evo slikeee");
                        res.render('trgovac/katalogNovi', {
                            artikli:req.artikli, id_trgovine, naziv
                        });
                    }
                })
        }

    })
});

router.get('/katalog/artikal/:id', async function(req, res, next) {
    let id_trgovine = req.session.id_trgovine;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli where id_artikla=$1`,
            [req.params.id], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikal = result.rows;
                    console.log(req.artikal)
                    res.render('trgovac/katalogArtikal', {
                        artikal:req.artikal,id_trgovine
                    });
                }
            })
    })
});

router.get('/katalog/artikal/kupac/:id/:id_trgovine', async function(req, res, next) {
    let id_trgovine = req.params.id_trgovine;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from artikli where id_artikla=$1`,
            [req.params.id], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikal = result.rows;
                    console.log(req.artikal)
                    res.render('kupac/katalogArtikalZaKupca', {
                        artikal:req.artikal,id_trgovine
                    });
                }
            })
    })
});



router.post('/izdvoji/:vrijednost/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update artikli 
        set izdvojen=$1
        where id_artikla=$2;`,

            [
                req.params.vrijednost,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});


router.post('/promocija/:vrijednost/:id', function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`update artikli 
        set izdvojen=$1
        where id_artikla=$2;`,

            [
                req.params.vrijednost,
                req.params.id,
            ],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }
                else{
                    res.sendStatus(200);
                }
            })
    })
});






module.exports = router;
