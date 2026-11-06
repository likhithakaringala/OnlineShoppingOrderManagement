# Online Shopping and Order Management System

A beginner-friendly full-stack project for practical/lab work. It includes customer registration/login, product catalogue and search, cart quantity updates/removal, checkout, order history, and admin product management.

## Technology stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Data storage: JSON file (`data/store.json`) for a simple local setup
- Automation: Selenium WebDriver
- DevOps: Git, GitHub, Jenkins, Docker and Kubernetes

## Requirements
Install Node.js 20 or later, Git, Docker Desktop, Kubernetes (Docker Desktop Kubernetes or Minikube), Java/Jenkins, and Google Chrome.

## 1. Run locally (Windows PowerShell or Command Prompt)

```powershell
cd OnlineShoppingOrderManagement
npm install
npm start
```
Open `http://localhost:3000`.

Stop the server with `Ctrl+C`.

### Demo admin account
- Email: `admin@shop.com`
- Password: `admin123`

Register a separate customer account to test shopping. The first run creates `data/store.json` and seeds sample products. Do not use the demo password in a public deployment.

## 2. Main modules to demonstrate
1. Customer registration and login
2. Product catalogue
3. Product search by name/category/description
4. Add product to cart
5. Update cart quantity and remove products
6. Checkout and stock update
7. Order history
8. Admin product management (add/delete products)

## 3. Git and GitHub

Create an empty GitHub repository named `online-shopping-order-management`, then run:

```powershell
git init
git add .
git commit -m "Initial Online Shopping project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/online-shopping-order-management.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. For later changes:

```powershell
git add .
git commit -m "Update shopping system"
git push
```

## 4. Jenkins

1. Install Jenkins and the NodeJS plugin.
2. In **Manage Jenkins → Tools**, configure a NodeJS installation named `NodeJS20`.
3. Create **New Item → Pipeline**.
4. Select **Pipeline script from SCM → Git**, enter your GitHub repository URL and branch `*/main`.
5. Save and select **Build Now**.
6. The included `Jenkinsfile` checks out the source, installs dependencies, checks the app health endpoint and builds a Docker image. The Selenium stage is shown as a configuration step; uncomment its command after Chrome is installed on the Jenkins agent.

For a Jenkins Linux agent, change the `bat` commands in the Docker stage to `sh 'docker build -t online-shopping-system:latest .'`. Ensure the agent has Docker access.

## 5. Docker

```powershell
docker build -t online-shopping-system:latest .
docker run -d --name online-shopping-container -p 3000:3000 -v shop-data:/app/data online-shopping-system:latest
docker ps
```
Open `http://localhost:3000`. To stop:

```powershell
docker stop online-shopping-container
docker rm online-shopping-container
```

Alternative using Compose:

```powershell
docker compose up --build -d
docker compose ps
docker compose down
```

## 6. Kubernetes (Docker Desktop Kubernetes)

Build the image locally first:

```powershell
docker build -t online-shopping-system:latest .
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl get deployments
kubectl get pods
kubectl get services
```
Open `http://localhost:30080` when using Docker Desktop Kubernetes with the local image. If your cluster cannot see the local image, push the image to Docker Hub and update the image field in `k8s/deployment.yaml` to `YOUR-DOCKERHUB-USERNAME/online-shopping-system:latest`.

Cleanup:

```powershell
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
```

**Learning note:** This starter uses a JSON file as its database. The Kubernetes manifest uses temporary pod storage, so data may not be shared between replicas or survive pod replacement. For production/multi-replica deployment, use a shared database (such as PostgreSQL) and persistent storage. This project is intended for local practical demonstration.

## 7. Selenium automated testing

Install dependencies:

```powershell
npm install
```
Start the app in one terminal:

```powershell
npm start
```
In a second terminal, run:

```powershell
npm run test:selenium
```
The test uses headless Chrome. Install Google Chrome on the machine; Selenium Manager will attempt to obtain a compatible driver. The seven browser test cases cover customer login, product search, add to cart, update quantity, remove product, checkout and order history (TC01–TC07).

## Useful API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/register` | Register customer |
| POST | `/api/login` | Customer/admin login |
| GET | `/api/products?q=mouse` | Search products |
| POST | `/api/cart` | Add item |
| PUT | `/api/cart/:productId` | Update quantity |
| DELETE | `/api/cart/:productId` | Remove item |
| POST | `/api/checkout` | Place order |
| GET | `/api/orders` | View order history |
| POST | `/api/products` | Admin add product |
| PUT | `/api/products/:id` | Admin update product |
| DELETE | `/api/products/:id` | Admin delete product |

## Suggested practical execution order
1. Run the application locally and test the modules.
2. Initialize Git and push the source code to GitHub.
3. Create a Jenkins pipeline from the GitHub repository.
4. Build and run the Docker image.
5. Deploy the image using Kubernetes.
6. Run Selenium tests and record the test results.

## Limitations / production hardening
This is an educational starter, not a production commerce platform. Before public use, add CSRF protection, stronger session-secret management, input validation, database transactions, persistent shared database storage, payment gateway integration, HTTPS, and role-management controls.
