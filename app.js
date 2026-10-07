/* ==========================================================
   Monitoring des connexions - app.js
   - Enregistre les visites dans le téléphone (localStorage)
   - Affiche les visites du jour et le résumé
   - Exporte la journée en fichier Excel (.xlsx)
   ========================================================== */

(function () {
  'use strict';

  // ---------- Éléments de la page ----------
  const form = document.getElementById('formVisite');
  const dateJour = document.getElementById('dateJour');
  const corpsTable = document.getElementById('corpsTable');
  const tableVisites = document.getElementById('tableVisites');
  const messageVide = document.getElementById('messageVide');
  const compteur = document.getElementById('compteur');
  const btnExport = document.getElementById('btnExport');
  const btnVider = document.getElementById('btnVider');

  const statVisites = document.getElementById('statVisites');
  const statOk = document.getElementById('statOk');
  const statKo = document.getElementById('statKo');
  const statDebit = document.getElementById('statDebit');

  // Nom sous lequel les visites sont gardées dans le navigateur
  const CLE_STOCKAGE = 'monitoring_visites';

  // ==========================================================
  // 1. DATES ET HEURES
  // ==========================================================

  // Date du jour au format AAAA-MM-JJ (heure locale)
  function cleDuJour(date) {
    const d = date || new Date();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mois + '-' + jour;
  }

  function heureActuelle() {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function afficherDateDuJour() {
    dateJour.textContent = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // ==========================================================
  // 2. STOCKAGE
  // ==========================================================

  function lireVisites() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      return brut ? JSON.parse(brut) : [];
    } catch (erreur) {
      return [];
    }
  }

  function sauverVisites(visites) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(visites));
      return true;
    } catch (erreur) {
      afficherMessage("Impossible d'enregistrer sur cet appareil.", true);
      return false;
    }
  }

  function visitesDuJour() {
    const aujourdhui = cleDuJour();
    return lireVisites().filter(function (v) {
      return v.date === aujourdhui;
    });
  }

  // ==========================================================
  // 3. MESSAGES À L'ÉCRAN
  // ==========================================================

  let minuteur = null;

  function afficherMessage(texte, erreur) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = texte;
    toast.classList.toggle('toast-erreur', Boolean(erreur));
    toast.classList.add('visible');
    clearTimeout(minuteur);
    minuteur = setTimeout(function () {
      toast.classList.remove('visible');
    }, 2800);
  }

  // ==========================================================
  // 4. AFFICHAGE DU TABLEAU ET DU RÉSUMÉ
  // ==========================================================

  function creerCellule(libelle, contenu) {
    const td = document.createElement('td');
    td.setAttribute('data-label', libelle);
    if (contenu instanceof Node) {
      td.appendChild(contenu);
    } else {
      td.textContent = contenu;
    }
    return td;
  }

  function creerBadge(connexion) {
    const badge = document.createElement('span');
    const marche = connexion === 'Oui';
    badge.className = 'badge ' + (marche ? 'badge-oui' : 'badge-non');
    badge.textContent = marche ? 'En service' : 'Hors service';
    return badge;
  }

  function texteOuTiret(texte) {
    return texte && texte.trim() !== '' ? texte : '–';
  }

  function creerLigne(visite) {
    const tr = document.createElement('tr');
    tr.className = visite.connexion === 'Oui' ? 'ok' : 'ko';

    const debit = visite.debit === null ? '–' : String(visite.debit).replace('.', ',');

    const boutonSuppr = document.createElement('button');
    boutonSuppr.type = 'button';
    boutonSuppr.className = 'btn-suppr';
    boutonSuppr.textContent = 'Supprimer';
    boutonSuppr.setAttribute('data-id', visite.id);

    tr.appendChild(creerCellule('Heure', visite.heure));
    tr.appendChild(creerCellule('Adresse', visite.adresse));
    tr.appendChild(creerCellule('Connexion', creerBadge(visite.connexion)));
    tr.appendChild(creerCellule('Débit (Mbps)', debit));
    tr.appendChild(creerCellule('Panne', texteOuTiret(visite.panne)));
    tr.appendChild(creerCellule('Demande', texteOuTiret(visite.demande)));

    const tdAction = document.createElement('td');
    tdAction.appendChild(boutonSuppr);
    tr.appendChild(tdAction);

    return tr;
  }

  function calculerDebitMoyen(visites) {
    const valeurs = visites
      .map(function (v) { return v.debit; })
      .filter(function (d) { return d !== null && !isNaN(d); });
    if (valeurs.length === 0) return null;
    const somme = valeurs.reduce(function (total, d) { return total + d; }, 0);
    return somme / valeurs.length;
  }

  function afficherResume(visites) {
    const enService = visites.filter(function (v) { return v.connexion === 'Oui'; }).length;
    const moyenne = calculerDebitMoyen(visites);

    statVisites.textContent = visites.length;
    statOk.textContent = enService;
    statKo.textContent = visites.length - enService;
    statDebit.textContent = moyenne === null
      ? '–'
      : moyenne.toFixed(1).replace('.', ',');
  }

  function afficher() {
    const visites = visitesDuJour();

    corpsTable.innerHTML = '';
    visites.forEach(function (visite) {
      corpsTable.appendChild(creerLigne(visite));
    });

    const aDesVisites = visites.length > 0;
    tableVisites.hidden = !aDesVisites;
    messageVide.hidden = aDesVisites;
    btnExport.disabled = !aDesVisites;
    btnVider.disabled = !aDesVisites;
    compteur.textContent = visites.length;

    afficherResume(visites);
  }

  // ==========================================================
  // 5. ENREGISTRER UNE VISITE
  // ==========================================================

  form.addEventListener('submit', function (evenement) {
    evenement.preventDefault();

    const donnees = new FormData(form);
    const debitSaisi = String(donnees.get('debit')).trim();

    const visite = {
      id: Date.now(),
      date: cleDuJour(),
      heure: heureActuelle(),
      adresse: String(donnees.get('adresse')).trim(),
      connexion: donnees.get('connexion'),
      debit: debitSaisi === '' ? null : Number(debitSaisi),
      panne: String(donnees.get('panne')).trim(),
      demande: String(donnees.get('demande')).trim()
    };

    const visites = lireVisites();
    visites.push(visite);

    if (sauverVisites(visites)) {
      form.reset();
      afficher();
      afficherMessage('Visite enregistrée.');
      document.getElementById('adresse').focus();
    }
  });

  // ==========================================================
  // 6. SUPPRIMER UNE VISITE / VIDER LA JOURNÉE
  // ==========================================================

  corpsTable.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('.btn-suppr');
    if (!bouton) return;

    if (!confirm('Supprimer cette visite ?')) return;

    const id = Number(bouton.getAttribute('data-id'));
    const restantes = lireVisites().filter(function (v) {
      return v.id !== id;
    });
    if (sauverVisites(restantes)) {
      afficher();
      afficherMessage('Visite supprimée.');
    }
  });

  btnVider.addEventListener('click', function () {
    if (!confirm("Supprimer toutes les visites d'aujourd'hui ? Pense à exporter avant.")) return;

    const aujourdhui = cleDuJour();
    const restantes = lireVisites().filter(function (v) {
      return v.date !== aujourdhui;
    });
    if (sauverVisites(restantes)) {
      afficher();
      afficherMessage('Journée vidée.');
    }
  });

  // ==========================================================
  // 7. EXPORT EXCEL
  // ==========================================================

  const ENTETES = ['Date', 'Heure', 'Adresse', 'Connexion', 'Débit (Mbps)', 'Panne', 'Demande'];

  function lignesPourExport(visites) {
    return visites.map(function (v) {
      return [
        v.date,
        v.heure,
        v.adresse,
        v.connexion === 'Oui' ? 'En service' : 'Hors service',
        v.debit === null ? '' : v.debit,
        v.panne,
        v.demande
      ];
    });
  }

  function exporterXlsx(visites, nomFichier) {
    const enService = visites.filter(function (v) { return v.connexion === 'Oui'; }).length;
    const moyenne = calculerDebitMoyen(visites);
    const nbPannes = visites.filter(function (v) { return v.panne !== ''; }).length;
    const nbDemandes = visites.filter(function (v) { return v.demande !== ''; }).length;

    // Feuille 1 : le détail des visites
    const feuille = XLSX.utils.aoa_to_sheet([ENTETES].concat(lignesPourExport(visites)));
    feuille['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 40 }
    ];

    // Feuille 2 : le résumé de la journée
    const resume = XLSX.utils.aoa_to_sheet([
      ['Résumé du ' + cleDuJour(), ''],
      ['Visites', visites.length],
      ['Connexions en service', enService],
      ['Connexions hors service', visites.length - enService],
      ['Débit moyen (Mbps)', moyenne === null ? '' : Math.round(moyenne * 100) / 100],
      ['Dépannages effectués', nbPannes],
      ['Demandes de clients', nbDemandes]
    ]);
    resume['!cols'] = [{ wch: 28 }, { wch: 14 }];

    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Monitoring');
    XLSX.utils.book_append_sheet(classeur, resume, 'Résumé');
    XLSX.writeFile(classeur, nomFichier + '.xlsx');
  }

  // Plan B si la bibliothèque Excel n'a pas pu se charger (pas d'internet) :
  // un fichier CSV, que Excel ouvre aussi.
  function exporterCsv(visites, nomFichier) {
    function proteger(valeur) {
      return '"' + String(valeur).replace(/"/g, '""') + '"';
    }
    const lignes = [ENTETES].concat(lignesPourExport(visites)).map(function (ligne) {
      return ligne.map(proteger).join(';');
    });
    const blob = new Blob(['\ufeff' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = nomFichier + '.csv';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(lien.href);
  }

  btnExport.addEventListener('click', function () {
    const visites = visitesDuJour();
    if (visites.length === 0) {
      afficherMessage("Aucune visite à exporter aujourd'hui.", true);
      return;
    }

    const nomFichier = 'Monitoring_' + cleDuJour();

    if (typeof XLSX !== 'undefined') {
      exporterXlsx(visites, nomFichier);
      afficherMessage('Fichier Excel créé.');
    } else {
      exporterCsv(visites, nomFichier);
      afficherMessage('Pas de connexion internet : fichier CSV créé à la place.');
    }
  });

  // ==========================================================
  // 8. ACCÈS : CRÉATION DU COMPTE ET CONNEXION
  // ==========================================================

  const CLE_COMPTE = 'monitoring_compte';
  const CLE_SESSION = 'monitoring_session';
  const ESSAIS_MAX = 5;
  const PAUSE_SECONDES = 30;

  const ecranAcces = document.getElementById('ecranAcces');
  const application = document.getElementById('application');
  const formCreation = document.getElementById('formCreation');
  const formConnexion = document.getElementById('formConnexion');
  const erreurCreation = document.getElementById('erreurCreation');
  const erreurConnexion = document.getElementById('erreurConnexion');
  const btnDeconnexion = document.getElementById('btnDeconnexion');
  const btnOublie = document.getElementById('btnOublie');

  let echecs = 0;
  let bloqueJusqua = 0;

  // --- Outils pour protéger le mot de passe (il n'est jamais gardé en clair) ---

  function enHex(octets) {
    return Array.from(octets).map(function (o) {
      return o.toString(16).padStart(2, '0');
    }).join('');
  }

  function genererSel() {
    const octets = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(octets);
    } else {
      for (let i = 0; i < octets.length; i++) octets[i] = Math.floor(Math.random() * 256);
    }
    return enHex(octets);
  }

  function methodeDisponible() {
    return window.crypto && crypto.subtle ? 'pbkdf2' : 'simple';
  }

  async function calculerEmpreinte(motDePasse, sel, methode) {
    if (methode === 'pbkdf2') {
      if (!(window.crypto && crypto.subtle)) {
        throw new Error('Chiffrement indisponible');
      }
      const encodeur = new TextEncoder();
      const cle = await crypto.subtle.importKey(
        'raw', encodeur.encode(motDePasse), 'PBKDF2', false, ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encodeur.encode(sel), iterations: 100000, hash: 'SHA-256' },
        cle,
        256
      );
      return enHex(new Uint8Array(bits));
    }

    // Plan B (navigateur sans chiffrement intégré) : protection plus légère
    const texte = sel + motDePasse;
    let h1 = 0x811c9dc5;
    let h2 = 5381;
    for (let i = 0; i < texte.length; i++) {
      const c = texte.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2, 33) ^ c;
    }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  // --- Lecture et écriture du compte ---

  function lireCompte() {
    try {
      const brut = localStorage.getItem(CLE_COMPTE);
      return brut ? JSON.parse(brut) : null;
    } catch (erreur) {
      return null;
    }
  }

  function sessionOuverte() {
    try {
      return sessionStorage.getItem(CLE_SESSION) === '1';
    } catch (erreur) {
      return false;
    }
  }

  function ouvrirSession() {
    try { sessionStorage.setItem(CLE_SESSION, '1'); } catch (erreur) { /* ignoré */ }
  }

  function fermerSession() {
    try { sessionStorage.removeItem(CLE_SESSION); } catch (erreur) { /* ignoré */ }
  }

  // --- Quel écran montrer ? ---

  function montrerApplication() {
    ecranAcces.hidden = true;
    application.hidden = false;
    window.scrollTo(0, 0);
  }

  function montrerAcces() {
    const compteExiste = Boolean(lireCompte());

    application.hidden = true;
    ecranAcces.hidden = false;
    formCreation.hidden = compteExiste;
    formConnexion.hidden = !compteExiste;

    formCreation.reset();
    formConnexion.reset();
    erreurCreation.textContent = '';
    erreurConnexion.textContent = '';
    remettreChampsMasques();

    const premierChamp = compteExiste
      ? document.getElementById('utilisateur')
      : document.getElementById('nouvelUtilisateur');
    premierChamp.focus();
  }

  function remettreChampsMasques() {
    document.querySelectorAll('.acces input[type="text"].mdp-visible').forEach(function (champ) {
      champ.type = 'password';
      champ.classList.remove('mdp-visible');
    });
  }

  // --- Case « Afficher le mot de passe » ---

  document.querySelectorAll('.voir-mdp').forEach(function (caseACocher) {
    caseACocher.addEventListener('change', function () {
      const formulaire = caseACocher.closest('form');
      formulaire.querySelectorAll('input[autocomplete$="password"]').forEach(function (champ) {
        champ.type = caseACocher.checked ? 'text' : 'password';
        champ.classList.toggle('mdp-visible', caseACocher.checked);
      });
    });
  });

  // --- Création du compte (première utilisation) ---

  formCreation.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    erreurCreation.textContent = '';

    const utilisateur = document.getElementById('nouvelUtilisateur').value.trim();
    const motDePasse = document.getElementById('nouveauMotDePasse').value;
    const confirmation = document.getElementById('confirmationMotDePasse').value;

    if (utilisateur.length < 3) {
      erreurCreation.textContent = "Le nom d'utilisateur doit avoir au moins 3 caractères.";
      return;
    }
    if (motDePasse.length < 6) {
      erreurCreation.textContent = 'Le mot de passe doit avoir au moins 6 caractères.';
      return;
    }
    if (motDePasse !== confirmation) {
      erreurCreation.textContent = 'Les deux mots de passe ne sont pas identiques.';
      return;
    }

    try {
      const sel = genererSel();
      const methode = methodeDisponible();
      const empreinte = await calculerEmpreinte(motDePasse, sel, methode);

      localStorage.setItem(CLE_COMPTE, JSON.stringify({
        utilisateur: utilisateur,
        sel: sel,
        methode: methode,
        empreinte: empreinte
      }));
    } catch (erreur) {
      erreurCreation.textContent = "Impossible d'enregistrer l'accès sur cet appareil.";
      return;
    }

    ouvrirSession();
    formCreation.reset();
    remettreChampsMasques();
    montrerApplication();
    afficherMessage('Accès créé. Bienvenue ' + utilisateur + '.');
  });

  // --- Connexion ---

  formConnexion.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    erreurConnexion.textContent = '';

    const maintenant = Date.now();
    if (maintenant < bloqueJusqua) {
      const reste = Math.ceil((bloqueJusqua - maintenant) / 1000);
      erreurConnexion.textContent = 'Trop d\'essais. Réessaie dans ' + reste + ' secondes.';
      return;
    }

    const compte = lireCompte();
    if (!compte) {
      montrerAcces();
      return;
    }

    const utilisateur = document.getElementById('utilisateur').value.trim();
    const motDePasse = document.getElementById('motDePasse').value;

    let empreinte;
    try {
      empreinte = await calculerEmpreinte(motDePasse, compte.sel, compte.methode);
    } catch (erreur) {
      erreurConnexion.textContent = 'Ce navigateur ne peut pas vérifier le mot de passe. Utilise le navigateur de départ.';
      return;
    }

    const utilisateurOk = utilisateur.toLowerCase() === compte.utilisateur.toLowerCase();
    const motDePasseOk = empreinte === compte.empreinte;

    if (utilisateurOk && motDePasseOk) {
      echecs = 0;
      ouvrirSession();
      formConnexion.reset();
      remettreChampsMasques();
      montrerApplication();
      afficherMessage('Bienvenue ' + compte.utilisateur + '.');
      return;
    }

    echecs += 1;
    if (echecs >= ESSAIS_MAX) {
      echecs = 0;
      bloqueJusqua = Date.now() + PAUSE_SECONDES * 1000;
      erreurConnexion.textContent = 'Trop d\'essais. Réessaie dans ' + PAUSE_SECONDES + ' secondes.';
    } else {
      erreurConnexion.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
    }
    document.getElementById('motDePasse').value = '';
  });

  // --- Déconnexion ---

  btnDeconnexion.addEventListener('click', function () {
    fermerSession();
    montrerAcces();
  });

  // --- Mot de passe oublié : on repart de zéro (les visites sont effacées aussi) ---

  btnOublie.addEventListener('click', function () {
    const message =
      'Attention : si tu réinitialises, le nom d\'utilisateur, le mot de passe ' +
      'ET toutes les visites enregistrées sur ce téléphone seront supprimés.\n\n' +
      'Continuer ?';
    if (!confirm(message)) return;

    try {
      localStorage.removeItem(CLE_COMPTE);
      localStorage.removeItem(CLE_STOCKAGE);
    } catch (erreur) { /* ignoré */ }

    fermerSession();
    afficher();
    montrerAcces();
    afficherMessage('Accès réinitialisé. Crée un nouvel accès.');
  });

  // ==========================================================
  // 9. DÉMARRAGE
  // ==========================================================

  afficherDateDuJour();
  afficher();

  if (sessionOuverte() && lireCompte()) {
    montrerApplication();
  } else {
    montrerAcces();
  }
})();