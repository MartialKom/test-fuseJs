# Utiliser une image Node.js comme base
FROM node:20 AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY . /app

RUN npm install -g @angular/cli

# Installer les dépendances
RUN npm install

CMD ["ng", "serve", "--host", "0.0.0.0"]