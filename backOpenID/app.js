const express = require('express');
const passport = require('passport'); // Importe Passport, une bibliothèque d'authentification pour Node.js
const OIDCStrategy = require('passport-openidconnect').Strategy; // Importe la stratégie OpenID Connect pour Passport
const session = require('express-session'); // Importe express-session pour gérer les sessions utilisateur
const bodyParser = require('body-parser');
const { Pool } = require('pg');

require('dotenv').config(); // Charge les variables d'environnement depuis le fichier .env
const app = express();
const port = 3001;

// Configuration de la session
app.use(session({
  secret: 'Yaya', // Clé secrète utilisée pour signer le cookie de session
  resave: true, // Force la session à être sauvegardée dans le store de session
  saveUninitialized: true // Force une session non initialisée à être sauvegardée dans le store
}));

// Initialisation de Passport pour l'authentification
app.use(passport.initialize()); // Initialise Passport
app.use(passport.session()); // Permet à Passport de gérer les sessions utilisateur

// Fonction pour configurer une stratégie OpenID Connect
function configureOIDCStrategy(name, config) {
  // Utilise Passport pour configurer une stratégie OpenID Connect
  passport.use(name, new OIDCStrategy({
    issuer: config.issuer, // URL de l'émetteur OpenID Connect
    authorizationURL: config.authorizationURL, // URL pour la demande d'autorisation
    tokenURL: config.tokenURL, // URL pour obtenir le token
    userInfoURL: config.userInfoURL, // URL pour obtenir les informations utilisateur
    clientID: config.clientID, // ID client pour l'application OAuth
    clientSecret: config.clientSecret, // Secret client pour l'application OAuth
    callbackURL: config.callbackURL, // URL de callback après l'authentification
    scope: config.scope // Scopes demandés
  }, (issuer, profile, cb) => {
    return cb(null, profile); // Fonction de callback après l'authentification
  }));

  // Définit les routes pour l'authentification avec cette stratégie
  app.get(`/auth/${name}`, passport.authenticate(name)); // Route pour démarrer l'authentification
  app.get(`/callback`, passport.authenticate(name, { failureRedirect: 'http://localhost:3000' }), (req, res) => {
    res.redirect('http://localhost:3000/success'); // Redirection en cas de succès
  });
  
}

// Configuration pour Google
configureOIDCStrategy('google', {
  issuer: 'https://accounts.google.com',   // Remplacez par votre fournisseur OpenID Connect
  authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth', // URL d'autorisation de votre fournisseur
  tokenURL: 'https://oauth2.googleapis.com/token', // URL de token de votre fournisseur
  userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo', // URL d'info utilisateur de votre fournisseur
  clientID: process.env.GOOGLE_CLIENT_ID, // Remplacez par votre Client ID
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Remplacez par votre Client Secret
  callbackURL: 'http://localhost:3001/callback', // URL de callback après l'authentification
  scope: 'openid profile email' // Les scopes requis
});



passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});


// Route d'authentification
app.get('/auth', passport.authenticate('openidconnect'));

app.get('/serverStatus', (req, res) => {
  
  res.send('Server is running');

});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pokemon',
  password: 'yaya',
  port: 5432, 
});

const validateCardData = (data) => {
  const { nom, photo, degats, pv } = data;
  return nom && photo && degats && pv;
};

// 1. Ajouter une Nouvelle Carte
app.post('/cards', async (req, res) => {
  try {
    const cardData = req.body;

    if (!validateCardData(cardData)) {
      return res.status(400).json({ message: 'Données incomplètes ou incorrectes.' });
    }

    const result = await pool.query(
      'INSERT INTO cards (nom, photo, degats, pv) VALUES ($1, $2, $3, $4) RETURNING *',
      [cardData.nom, cardData.photo, cardData.degats, cardData.pv]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// 2. Voir Toutes les Cartes
app.get('/cards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cards');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// 3. Voir une Carte
app.get('/cards/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    const result = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Carte non trouvée.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// 4. Supprimer une Carte
app.delete('/cards/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    const result = await pool.query('DELETE FROM cards WHERE id = $1 RETURNING *', [cardId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Carte non trouvée.' });
    }

    res.json({ message: 'Carte supprimée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// 5. Modifier une Carte
app.put('/cards/:id', async (req, res) => {
    try {
      const cardId = req.params.id;
      const cardData = req.body;
  
      const existingCard = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId]);
  
      if (existingCard.rows.length === 0) {
        return res.status(404).json({ message: 'Carte non trouvée.' });
      }
      const updatedCard = { ...existingCard.rows[0], ...cardData };
  
      const result = await pool.query(
        'UPDATE cards SET nom = $1, photo = $2, degats = $3, pv = $4 WHERE id = $5 RETURNING *',
        [updatedCard.nom, updatedCard.photo, updatedCard.degats, updatedCard.pv, cardId]
      );
  
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  });
  

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
