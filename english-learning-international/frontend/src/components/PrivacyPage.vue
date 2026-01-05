<template>
  <div class="privacy-page" :class="{ 'dark-mode': userStore.theme === 'dark' }">
    <div class="privacy-container">
      <header class="privacy-header animate-fade-in">
        <h1 class="gradient-text">Privacy Policy</h1>
        <p class="subtitle">Effective Date: January 1, 2026</p>
      </header>

      <div class="policy-content animate-slide-up">
        <section class="policy-section">
          <h2>1. Data We Collect (我们收集的数据)</h2>
          <p>
            We only collect your email address for the sole purpose of account authentication and providing access to our language learning services.
          </p>
          <p class="zh-text">
            我们仅收集您的电子邮箱地址，其唯一目的是进行账号身份验证并为您提供语言学习服务。
          </p>
        </section>

        <section class="policy-section">
          <h2>2. How We Use Your Data (我们如何使用数据)</h2>
          <p>
            Your email is used to send one-time passwords (OTP) for login and essential service updates. We do not sell your data to third parties.
          </p>
          <p class="zh-text">
            您的邮箱仅用于发送登录验证码（OTP）及必要的服务通知。我们绝不会将您的数据出售给第三方。
          </p>
        </section>

        <section class="policy-section">
          <h2>3. Third-Party Services (第三方服务)</h2>
          <p>
            We use Stripe for payment processing and trusted mail servers for sending verification codes. These providers handle your data according to their own strict privacy standards.
          </p>
          <p class="zh-text">
            我们使用 Stripe 处理支付，并使用受信任的邮件服务器发送验证码。这些服务商将根据其严格的隐私标准处理您的数据。
          </p>
        </section>

        <section class="policy-section">
          <h2>4. Data Storage (数据存储)</h2>
          <p>
            Your data is stored securely on our servers. As a user, you have the right to request the deletion of your account and data at any time.
          </p>
          <p class="zh-text">
            您的数据安全地存储在我们的服务器上。作为用户，您有权随时要求注销账号并删除数据。
          </p>
        </section>

        <section class="policy-section">
          <h2>5. Contact Us (联系我们)</h2>
          <p>
            For any privacy-related inquiries, please contact: <a href="mailto:admin@vocalis.ltd" class="email-link">admin@vocalis.ltd</a>
          </p>
          <p class="zh-text">
            如有任何隐私相关咨询，请联系：<a href="mailto:admin@vocalis.ltd" class="email-link">admin@vocalis.ltd</a>
          </p>
        </section>
      </div>

      <footer class="privacy-footer">
        <p>© 2026 VOCALIS LTD. All Rights Reserved.</p>
        <button @click="$router.back()" class="btn-back">Return to Previous Page</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { userStore } from '../store/user.js';
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

.privacy-page {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  padding: 60px 20px;
  background: #fdfdfd;
  color: #2d3748;
  transition: all 0.3s ease;
}

.privacy-page.dark-mode {
  background: #1a202c;
  color: #e2e8f0;
}

.privacy-container {
  max-width: 800px;
  margin: 0 auto;
}

.privacy-header {
  text-align: center;
  margin-bottom: 50px;
}

.gradient-text {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #4A5568 0%, #2D3748 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.dark-mode .gradient-text {
  background: linear-gradient(135deg, #a0aec0 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1rem;
  opacity: 0.6;
}

.policy-content {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark-mode .policy-content {
  background: #2d3748;
}

.policy-section {
  margin-bottom: 40px;
}

.policy-section:last-child {
  margin-bottom: 0;
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: #4a5568;
  border-left: 4px solid #f48c25;
  padding-left: 15px;
}

.dark-mode h2 {
  color: #e2e8f0;
}

p {
  line-height: 1.6;
  margin-bottom: 10px;
  font-size: 1.05rem;
}

.zh-text {
  color: #718096;
  font-size: 0.95rem;
}

.dark-mode .zh-text {
  color: #a0aec0;
}

.email-link {
  color: #f48c25;
  text-decoration: none;
  font-weight: 600;
}

.email-link:hover {
  text-decoration: underline;
}

.privacy-footer {
  margin-top: 50px;
  text-align: center;
}

.btn-back {
  margin-top: 20px;
  background: transparent;
  border: 1px solid #cbd5e0;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: inherit;
}

.btn-back:hover {
  background: #edf2f7;
  border-color: #a0aec0;
}

.dark-mode .btn-back:hover {
  background: #4a5568;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.8s ease forwards;
}

.animate-slide-up {
  animation: slideUp 0.6s ease forwards;
}
</style>
