const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const app = express()
app.set('view engine', 'ejs')
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: true }))


const db_url ='mongodb+srv://mariagiovanna077:mongodb@cluster0.fe1mq.mongodb.net/?retryWrites=true&w=majority'
const db_name = 'StreamGo'
let db
// connessione al db 
MongoClient.connect(db_url, { useNewUrlParser: true }, (err, client) => {
    if (err) return console.log(err)
    db = client.db(db_name)
    console.log('Connected to MongoDB')
    console.log(`Database: ${db_name}`)
    app.listen(3000, () => console.log('listening on 3000'))
})

//index find all documents
app.get('/', (req, res) => {
         const collection = db.collection('Title')
        collection.find({}).toArray((err, docs) => {
            if (err) {
                throw err;
            }
            console.log(docs)
            res.render('index', { user: docs })
        })
})
// query in base al titolo
app.post('/title', (req, res) => {
    const collection = db.collection('Title')
    var titolo = req.body.titolo
    collection.find({ Title: { $regex: titolo } })
        .toArray((err, docs) => {
        if (err) {
            throw err;
        }
        res.render('index', { user: docs })
        console.log(docs)
        })
})
// find in base al genere e in base alla lingua (query combinate)  
app.post('/genere/lingua', (req, res) => {
    const collection = db.collection('Title')
    var genere = req.body.genere
    var lingua = req.body.lingua
    if (genere == 'all') { 
        collection.find({
            'Language': lingua
        })
            .toArray((err, docs) => {
                if (err) {
                    throw err;
                }
                console.log(docs)
                res.render('index', { user: docs })
            });
    } else if (lingua == 'all') {
        collection.find({
            "Genre": genere
        }).toArray((err, docs) => {
            if (err) {
                throw err;
            }
            res.render('index', { user: docs })
            console.log(docs)
        });
    } else {
        collection.find({
            "Genre": genere,
            "Language": lingua
        }).toArray((err, docs) => {
            if (err) {
                throw err;
            }
            res.render('index', { user: docs })
            console.log(docs)
        });
    }
       
    
   
})
//ricerca per anno di uscita ( scelta fra ultimi 2/5/10/20 anni  )
app.post('/years', (req, res) => {
    const collection = db.collection('Title')
    var input = parseInt(req.body.anno)
    var anno = 2022 -input;
    collection.find({
        release_year: { $gte: anno }
    }).sort({ release_year: 1 }).toArray((err, docs) => {
        if (err) {
            throw err;
        }
        console.log(docs)
        res.render('index', { user: docs })
    });
})

// maggiore valutazione  da imdbscore
app.post('/top10', (req, res) => {
    const collection = db.collection('Title')
    collection.find({}).sort({ IMDB_Score: -1 }).limit(10).toArray((err, docs) => {
        if (err) {
            throw err;
        }
        console.log(docs)
        res.render('index', { user: docs })
    });
})

// insert new film o serie tv (Controllo elemento già è presente)
app.post('/suggerisci/insert', async (req, res) => {
    console.log('/insert ok')
    const collection = db.collection('Title')
    var titolo= req.body.titolo
    var genere= req.body.genere
    var lingua = req.body.lingua
    var tipo= req.body.type
    var anno = parseInt(req.body.anno)
    var descrizione= req.body.descrizione
    collection.find({
        Title: titolo
    }).toArray((err, docs) => {
        if (err) {
            throw err;
        }
        if (docs.length == 0) {
            const docs = {
                Title: titolo,
                Genre: genere,
                Language: lingua,
                type: tipo,
                release_year: anno,
                description: descrizione,
              //alcuni campi non vengono inseriti dall'utente, in controllo e il riempimento di tali campi è a cura dei dipendenti di StreamGo
                Premiere: "...",
                IMDB_Score: "...",
                id: "...",
                production_countries: "...",
                imdb_id: "...",
                imdb_votes:"..."
            };
            db.collection('Title').insertOne(docs, (err, docs) => {
                if (err) throw err;
                console.log("1 document inserted")
                res.render('insert', { esito: "INSERITO" })
            })
        }
        else {
            console.log("document già c'è ciaoooo")
            res.render('insert', { esito: " NON INSERITO" })
        }
    });
 

})
// form insert inizializzazione
app.post('/suggerisci', (req, res) => {
    res.render('insert',{ esito: "" })
})



// query attori (ricerca in base all'id ma titolo per interfaccia utente) 
app.post('/attori', (req, res) => {
    const collection = db.collection('Title')
    var titolo = req.body.titolo
    collection.find({ Title: titolo })
        .toArray((err, docs2) => {
            if (err) {
                throw err;
            }
            console.log(docs2[0].id)
            collection.find({ id: docs2[0].id })
                .toArray((err, docs) => {
                    if (err) {
                        throw err;
                    }
                    console.log(docs)
                    res.render('attori', { user: docs })
                })
        })  
})
// grafici*************************************************************************


// grafici curiosita
app.post('/curiosita', (req, res) => {
    var dati
    var datilingua
    const collection = db.collection('Title')
    //valutazione dei titoli in base all'anno di uscita
    collection.aggregate([
        {
            $group: {
                _id: "$release_year",
                somma: {
                    $sum: "$IMDB_Score"
                },
                count: { $sum: 1 }
            }
        }
    ]).sort({ _id: -1 }).toArray((err, docs) => {
        if (err) {
            throw err;
        }
        console.log(docs)
        const collection2 = db.collection('Title')
        // raggruppa titoli in base alla lingua (vedere quale lingua prevale nel db)
        collection2.aggregate([
            {
                $group: {
                    _id: "$Language",
                    count: { $sum: 1 }
                }
            }
        ]).sort({ count: -1 }).toArray((err, docs2) => {
            if (err) {
                throw err;
            }
            console.log(docs2)
            res.render('curiosita', { dati: docs ,  datilingua: docs2 })

        })
    })

})

// gestione errori (pag inesistente)
app.get('/*', (req, res) => {

    res.send('OPS... Quancosa é andato storto. RISORSA NON TROVATA')
})







