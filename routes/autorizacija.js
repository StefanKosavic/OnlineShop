function autorizacijaAdmina(req,res,next){
    if(req.session.admin==null){
        res.sendStatus(404);
    }
    else{
        next();

    }
}
function autorizacijaKupca(req,res,next){
    if(req.session.kupac==null){
        res.sendStatus(404);
    }
    else{
        next();
    }
}
function autorizacijaTrgovca(req,res,next){
    if(req.session.trgovac==null){
        res.sendStatus(404);
    }
    else{
        next();
    }
}

module.exports = {
    autorizacijaAdmina,
    autorizacijaKupca,
    autorizacijaTrgovca
}