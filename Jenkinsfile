pipeline {
    agent any
    tools { nodejs 'NodeJS20' }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install Dependencies') {
            steps { bat 'npm install' }
        }
        stage('Application Health Check') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node server.js > app.log 2>&1 &'
                        sh 'for i in $(seq 1 20); do curl -fsS http://localhost:3000/api/health && break || sleep 2; done'
                    } else {
                        bat 'start /B node server.js'
                        bat 'powershell -Command "$ok=$false; for($i=0;$i -lt 20;$i++){try{$r=Invoke-RestMethod http://localhost:3000/api/health;$ok=$true;break}catch{Start-Sleep 2}}; if(-not $ok){exit 1}"'
                    }
                }
            }
        }
        stage('Selenium UI Tests') {
            steps {
                echo 'Run Selenium tests when Chrome/ChromeDriver are installed on this Jenkins agent.'
                // Uncomment after configuring Chrome on the Jenkins agent:
                // bat 'npm run test:selenium'
            }
        }
        stage('Build Docker Image') {
            steps { bat 'docker build -t online-shopping-system:latest .' }
        }
    }
    post { always { echo 'Pipeline execution completed.' } }
}
