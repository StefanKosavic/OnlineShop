var express = require('express');
var router = express.Router();
const nodemailer = require("nodemailer");
const fileUpload = require('express-fileupload');
const {autorizacijaKupca}=require("./autorizacija");
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var pg =require('pg');
var config = {
    user: 'meiogwic', //env var: PGUSER
    database: 'meiogwic', //env var: PGDATABASE
    password: 'J4d5VLUv-owaKaaff11XC308QxW4nKI-', //env var: PGPASSWORD
    host: 'tyke.db.elephantsql.com', // Server hosting the postgres database
    port: 5432, //env var: PGPORT
    max: 10, // max number of clients in the pool
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

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/register', async function(req, res, next) {
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
                    res.render('kupac/register', {
                        kategorije:req.kategorije,
                    });
                }
            })
    })
});

router.post('/register', async function(req, res, next) {

    const hashedPassword = await bcrypt.hash(req.body.sifra,10);
    let sampleFile;
    let uploadPath;

    if(!req.files || Object.keys(req.files).length ===0 ){
        return res.sendStatus(400).send("nije ucitana slika");
    }
    sampleFile = await req.files.sampleFile;
    uploadPath = __dirname + '/../public/images/' + sampleFile.name
     var  korisnik =  {
        email: req.body.email,
        username: req.body.username,
        sifra: hashedPassword,
        ime: req.body.ime,
        prezime: req.body.prezime,
        kategorija: await req.body.kategorija,
    };
    //use mv()
    console.log(korisnik.kategorija);
    await sampleFile.mv(uploadPath,async function (err){
        if(err)  return res.status(500).send(err);
        console.log("Uspio je prvi " + sampleFile.name);

    pool.connect(async function(err,client,done){
        if(!korisnik.email || !korisnik.username || !korisnik.sifra || !korisnik.ime
            || !korisnik.prezime || !korisnik.kategorija){
            res.render('kupac/greskaRegister',{poruka:"Nijedno polje ne smije biti prazno"});
        }else{
          await client.query(`insert into kupci (ime,prezime,username,sifra,email,interes,slika)
     values ($1,$2,$3,$4,$5,$6,$7)`,
                [korisnik.ime,korisnik.prezime,korisnik.username,korisnik.sifra,
                    korisnik.email,korisnik.kategorija,sampleFile.name],
                function (err,result){
                    done();
                    if(err){
                        res.render('kupac/greska',{poruka:"Pogresan username ili sifra"});
                    }else{
                        res.render('kupac/login');
                    }
                })
        }

        })
    })
});

router.get('/login', async function(req, res, next) {
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
                    res.render('kupac/login', {
                        kategorije:req.kategorije,
                    });
                }
            })
    })
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
        client.query(`SELECT * FROM kupci where username=$1`,[korisnik.username],async function (err,result){
            done();
            if(err){
                res.render('kupac/greska',{poruka:"Pogresan username ili sifra"});
            }else{
                console.log("OVO SAM SVE DOBIO" + result.rows);
                if(result.rows.length === 0){
                    res.render('kupac/greska',{poruka:"Pogresan username ili sifra"});
                }else{
                    console.info(result.rows);
                    let kriptoSifra = result.rows[0].sifra;
                    //console.log("Ovo je prava sifra " + korisnik.sifra);
                    //console.log("Ovo je kripto sifra " + kriptoSifra);
                    if(await bcrypt.compare(korisnik.sifra,kriptoSifra)){
                        res.korisnik = {
                            id_kupca: result.rows[0].id_kupca,
                            ime: result.rows[0].ime,
                            prezime: result.rows[0].prezime,
                            username: result.rows[0].username,
                            email: result.rows[0].email,
                            interes: result.rows[0].interes
                        }
                        req.session.kupac = korisnik.username;
                        req.session.id_kupca =res.korisnik.id_kupca;
                        req.session.email =res.korisnik.email;
                        req.session.kupac_kategorija=res.korisnik.interes;
                        console.log("tu sammmmm i ovo je id korisnika " + req.session.id_kupca);
                        res.redirect('/kupac/home');
                    }
                    else{
                        console.info("Losa sifra!");
                        return res.sendStatus(401);
                    }
                }
            }
        })
    })
});


router.get('/home', autorizacijaKupca, function(req, res, next) {
    let kategorija = req.session.kupac_kategorija;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select a.id_artikla, a.naziv as naziv_artikla,a.opis,a.kategorija,a.cijena,a.slika,
        t.naziv,t.adresa from artikli a,trgovine t where
        a.id_trgovine=t.id_trgovine and a.kategorija=$1;`,
            [kategorija], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.artikli = result.rows;
                    //console.log(req.artikli);
                    next();
                }
            })
    })
});

router.get('/home',autorizacijaKupca,function(req, res, next) {
    let imeKupca = req.session.kupac;
    let kategorija = req.session.kupac_kategorija;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select a.id_artikla,a.naziv as naziv_artikla,a.opis,a.kategorija,a.cijena,a.slika,
        t.naziv,t.adresa,t.id_trgovine from artikli a,trgovine t where
        a.id_trgovine=t.id_trgovine and a.kategorija!=$1 limit 3;`,
            [kategorija], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.ostalo = result.rows;
                    const sve = req.artikli.concat(req.ostalo);
                    console.log(sve);
                    res.render('kupac/home', {
                        sve,imeKupca
                    });
                }
            })
    })
});

router.get('/narudzbe',autorizacijaKupca,function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select t.telefon,t.slika,t.naziv,t.email,t.grad,n.status,n.id_narudzbe
                      from trgovine t,narudzbe n where t.id_trgovine = n.id_trgovine order by n.status desc;`,
            [], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.narudzbe = result.rows;
                    res.render('kupac/narudzbe', {
                        narudzbe:req.narudzbe
                    });
                }
            })
    })
});

router.get('/narudzbe/posebniArtikli/:id_narudzbe', autorizacijaKupca, async function(req, res, next) {
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
                    res.render('kupac/narudzbePosebniArtikli', {
                        artikliNarudzbe:req.artikliNarudzbe
                    });
                }
            })
    })
});

router.post('/otkaziNarudzbu/:id_narudzbe', function(req, res, next) {
    let status = "otkazana";
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
                    res.sendStatus(200);
                }
            })
    })
});

router.get('/artikli/nazivArtikla/:naziv', autorizacijaKupca,function(req, res, next) {
    let naziv = req.params.naziv;
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select a.naziv as naziv_artikla,a.opis,a.kategorija,a.cijena,a.slika,a.id_artikla,
        t.naziv,t.adresa,t.id_trgovine  from artikli a,trgovine t where
        a.id_trgovine=t.id_trgovine and a.naziv LIKE '%' || $1 || '%'`,
            [naziv],function (err,result){
                done();
                if(err){
                    console.info(err);
                } else {
                    req.artikli = result.rows;
                    console.log(req.artikli);
                    res.render('kupac/searchArtikal', {
                        artikli:req.artikli,naziv
                    });
                }
            })
    })
});

router.get('/trgovine/nazivTrgovine/:nazivTrgovine',autorizacijaKupca, function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select * from trgovine where naziv LIKE '%' || $1 || '%';`,
            [req.params.nazivTrgovine],function (err,result){
                done();
                if(err){
                    console.info(err);
                    //res.redirect('/home/greska')
                } else {
                    req.trgovine = result.rows;
                    console.log(req.trgovine);
                    res.render('kupac/searchTrgovina', {
                        trgovine:req.trgovine
                    });
                }
            })
    })
});

router.post('/ocjenaArtikla/:ocjena/:id', async function(req, res, next) {

    pool.connect(function(err,client,done){
            client.query(`insert into ocjene_artikli (ocjena,id_artikla) values ($1,$2)`,
                [req.params.ocjena,req.params.id],
                function (err,result){
                    done();
                    if(err){
                        res.sendStatus(500);
                    }else {
                        res.sendStatus(200);
                    }
                })


    })
});

router.post('/dodajUKorpu/:id_artikla/:id_trgovine', async function(req, res, next) {
    let id_kupca = req.session.id_kupca;
    pool.connect(function(err,client,done){
        client.query(`insert into korpa (id_artikla,id_kupca,id_trgovine) values ($1,$2,$3)`,
            [req.params.id_artikla,id_kupca, req.params.id_trgovine],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }else {
                    res.sendStatus(200);
                }
            })


    })
});

router.post('/spasiArtikal/:id_artikla/:id_trgovine', async function(req, res, next) {
    let id_kupca = req.session.id_kupca;
    pool.connect(function(err,client,done){
        client.query(`insert into spaseni_artikli (id_artikla,id_trgovine,id_kupca) values ($1,$2,$3)`,
            [req.params.id_artikla,req.params.id_trgovine,id_kupca],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }else {
                    res.sendStatus(200);
                }
            })


    })
});

router.get('/korpa/artikli', autorizacijaKupca, async function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select a.slika,a.id_artikla,a.naziv,a.opis,a.kategorija,a.cijena,t.id_trgovine from artikli a
                      inner join trgovine t on t.id_trgovine = a.id_trgovine
                      inner join korpa k on a.id_artikla = k.id_artikla;`,
            [], async function (err,result){
                await done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.korpa = result.rows;
                    console.log(req.korpa);
                    await res.render('kupac/korpa', {
                        korpa: req.korpa
                    });
                }
            })
    })
});

router.get('/wishList', autorizacijaKupca, function(req, res, next) {
    pool.connect(function(err,client,done){
        if(err){
            res.end('{"error" : "Error", "status" : 500');
        }
        client.query(`select a.slika,a.id_artikla,a.naziv,a.opis,a.kategorija,a.cijena,t.id_trgovine from artikli a
                      inner join trgovine t on t.id_trgovine = a.id_trgovine
                      inner join spaseni_artikli s on a.id_artikla = s.id_artikla;`,
            [], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                    req.wishList = result.rows;
                    console.log(req.korpa);
                    res.render('kupac/wishList', {
                        wishList: req.wishList
                    });
                }
            })
    })
});


router.post('/izbaciIzKorpe/:id_artikla', async function(req, res, next) {
    pool.connect(function(err,client,done){
        client.query(`delete from korpa where id_artikla=$1`,
            [req.params.id_artikla],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }else {
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/izbaciIzWishLista/:id_artikla', async function(req, res, next) {
    pool.connect(function(err,client,done){
        client.query(`delete from spaseni_artikli where id_artikla=$1`,
            [req.params.id_artikla],
            function (err,result){
                done();
                if(err){
                    res.sendStatus(500);
                }else {
                    res.sendStatus(200);
                }
            })
    })
});

router.post('/naruci/:id_trgovine', async function(req, res, next) {
    let id_kupca = req.session.id_kupca;
    let email = req.session.email;
    console.info(id_kupca);
     await pool.query(`insert into narudzbe (id_kupca, id_trgovine) values ($1, $2)`, [id_kupca, req.params.id_trgovine],
       async  (err, result) => {
           await pool.query(`select id_narudzbe from narudzbe order by id_narudzbe desc limit 1`,
                 async (err, result) => {
                req.narudzbe = result.rows;
                   await pool.query(`select id_artikla from korpa`,
                         async (err, result) => {
                            req.artikli = result.rows;
                            for(let i=0;i<req.artikli.length;i++) {
                                console.log("IIII "+ i);
                              await pool.query(`insert into korpa_narudzbe(id_narudzbe, id_artikla) values ($1, $2)`,
                                    [req.narudzbe[0].id_narudzbe, req.artikli[i].id_artikla],
                                     console.log("JJJJJJJJ" + i),
                                     (err, result) => {
                                         console.log("ERRRRR "+ i);
                                    })
                            }
                        })
                    pool.query(`delete from korpa`,
                         (err, result) => {
                             let mailOptions = {
                                 from: 'stefan.kosavic10@gmail.com', // sender address
                                 to: email, // list of receivers
                                 subject: "Postovani, vasa narudzba je uspjesno poslana", // Subject line
                                 text: "Ovim putem Vas obavjestavamo, da je Vasa narudzba uspjesno poslana i prihvacena na cekanje", // plain text body

                             };

                             transporter.sendMail(mailOptions,function(error,info) {
                                 if (error) {
                                     console.log(error);
                                 } else {
                                     console.log("Email je poslan" + info.response);
                                 }
                             });
                            res.sendStatus(200);
                        })
                })
        })

});


/*orderNow : async function (req, res, next){
        await pool.query(`insert into orders(shop_id, customer_id) values ($1, $2)`, [req.params.shop, req.params.customer],
             async (err, result) => {
              await  pool.query(`select order_id from orders order by order_id desc limit 1`,
                   async (err, result) => {
                        req.order = result.rows;
                       await pool.query(`select product_id from cart`,
                           async (err, result) => {
                            req.products = result.rows;
                            let Length = 0;
                            while(Length !== req.products.length) {
                                await pool.query(`insert into order_detail(order_id, product_id) values ($1, $2)`,
                                    [req.order[0].order_id, req.products[Length].product_id],
                                    (err, result) => {} )
                                Length = Length + 1;
                            }
                       })
                       pool.query(`delete from cart`,
                           (err, result) => {
                               next();
                           })
                    })
            })
    },*/

/*router.post('/naruci', function(req, res, next) {
    pool.connect(async function(err,client,done){
        await client.query(`select * from korpa`,
            [], function (err,result){
                done();
                if(err){
                    console.info(err);
                    res.sendStatus(500);
                }else{
                   next();
                }
                let artikli = result.rows;
                for(let i=0;i<artikli.length;i++){
                    pool.connect( async function(err,client,done){
                       await client.query(`insert into narudzbe (id_artikla,id_kupca,id_trgovine) values ($1,$2,$3);`,
                            [parseInt(artikli[i].id_artikla),parseInt(artikli[i].id_kupca),parseInt(artikli[i].id_trgovca)], function (err,result){
                                done();
                               if(err){
                                   console.info(err);
                                   res.sendStatus(500);
                               }else{
                                   next();
                               }
                                pool.connect(async function(err,client,done){
                                   await client.query(`delete from korpa`,
                                        [], function (err,result){
                                            done();
                                            if(err){
                                                console.info(err);
                                                res.sendStatus(500);
                                            }else{
                                                res.sendStatus(200);
                                            }
                                        })
                                })
                            })
                    })
                }

            })
    })
});

*/


module.exports = router;
