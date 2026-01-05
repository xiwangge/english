<template>
  <div class="about-page" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="about-container">
      <header class="about-header animate-fade-in">
        <h1 class="gradient-text">About Xuebubu</h1>
        <p class="subtitle">Powered by <strong>VOCALIS LTD</strong> — Mastery Redefined</p>
      </header>

      <div class="content-grid">
        <section class="info-card animate-slide-up">
          <div class="icon-wrapper">
            <span class="feature-icon">🚀</span>
          </div>
          <h2>Our Vision</h2>
          <p>
            Xuebubu, powered by <strong>VOCALIS LTD</strong>, is an innovative EdTech platform redefining the way we master 
            <strong>English and Chinese</strong>. We turn language learning into an engaging journey.
          </p>
        </section>

        <section class="info-card animate-slide-up" style="animation-delay: 0.1s">
          <div class="icon-wrapper">
            <span class="feature-icon">�</span>
          </div>
          <h2>Cultural & Interactive</h2>
          <p>
            By combining cutting-edge interactive web technology with <strong>rich cultural insights</strong> 
            and gamified experiences, we make every lesson feel like an adventure.
          </p>
        </section>

        <section class="info-card animate-slide-up" style="animation-delay: 0.2s">
          <div class="icon-wrapper">
            <span class="feature-icon">✨</span>
          </div>
          <h2>Our Mission</h2>
          <p>
            Delivering a secure and high-impact environment for students and self-learners across the globe 
             to achieve their <strong>linguistic goals</strong> with confidence.
          </p>
        </section>

        <section class="info-card animate-slide-up" style="animation-delay: 0.3s">
          <div class="icon-wrapper">
            <span class="feature-icon">�</span>
          </div>
          <h2>Flexible SaaS</h2>
          <p>
            Our global platform offers <strong>flexible subscription plans</strong>, ensuring that premium 
            learning features are accessible to everyone, everywhere.
          </p>
        </section>

        <section class="info-card full-width animate-slide-up" style="animation-delay: 0.4s">
          <div class="payment-info">
            <div class="stripe-badge">
              <span class="lock-icon">🔒</span>
              Seamless Payments via Stripe
            </div>
            <p>
              We ensure a secure and reliable experience with <strong>seamless international payments</strong> 
              processed through Stripe, allowing you to focus entirely on your learning journey.
            </p>
          </div>
        </section>
      </div>

      <footer class="about-footer">
        <p>© 2026 VOCALIS LTD. All Rights Reserved.</p>
        <p><router-link :to="{ name: 'privacy' }" class="privacy-link">Privacy Policy</router-link></p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { userStore } from '../store/user.js';
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

.about-page {
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  padding: 40px 20px;
  background: #fff8f5;
  color: #3d2e24;
  transition: all 0.3s ease;
}

.about-page.dark-mode {
  background: #1a202c;
  color: #e2e8f0;
}

.about-container {
  max-width: 1000px;
  margin: 0 auto;
}

.about-header {
  text-align: center;
  margin-bottom: 60px;
}

.gradient-text {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff8a65 0%, #f48c25 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.25rem;
  opacity: 0.8;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
}

.info-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 40px;
  border: 1px solid rgba(244, 140, 37, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dark-mode .info-card {
  background: rgba(45, 55, 72, 0.7);
  border-color: rgba(226, 232, 240, 0.1);
}

.info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.icon-wrapper {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #f48c25;
}

p {
  line-height: 1.7;
  font-size: 1.1rem;
  opacity: 0.9;
}

.full-width {
  grid-column: 1 / -1;
}

.payment-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stripe-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #635bff;
  color: white;
  padding: 10px 20px;
  border-radius: 50px;
  font-weight: 600;
  margin-bottom: 20px;
}

.about-footer {
  margin-top: 80px;
  text-align: center;
  opacity: 0.6;
  font-size: 0.9rem;
}

.privacy-link {
  color: #f48c25;
  text-decoration: none;
}

.privacy-link:hover {
  text-decoration: underline;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 1s ease forwards;
}

.animate-slide-up {
  animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
}

@media (max-width: 640px) {
  .gradient-text { font-size: 2.5rem; }
  .content-grid { grid-template-columns: 1fr; }
  .info-card { padding: 30px; }
}
</style>
