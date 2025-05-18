# Utiliser une image Node.js comme base
FROM node:20 AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY . /app

# Installer les dépendances
RUN npm install

# Construire l'application Angular
RUN npm run build

CMD ["ng", "serve", "--host", "0.0.0.0"]