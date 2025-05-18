# Utiliser une image Node.js comme base
FROM node:20 AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du projet
COPY . .

# Construire l'application Angular
RUN npm run build

# Étape pour servir l'application
FROM nginx:alpine

# Copier les fichiers construits dans le répertoire de Nginx
COPY --from=build /app/dist/fuse /usr/share/nginx/html

EXPOSE 9009

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]