import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "raffles": "Raffles",
        "dashboard": "Dashboard",
        "admin": "Admin",
        "login": "Login",
        "register": "Register",
        "logout": "Logout"
      },
      "home": {
        "hero_title": "Win Big with RifaAngola",
        "hero_subtitle": "The most transparent and exciting raffle platform in Angola.",
        "cta": "Explore Raffles",
        "how_it_works": "How it Works",
        "step1": "Choose a Raffle",
        "step2": "Buy a Number",
        "step3": "Win Prizes",
        "motivational": "Your luck is just one click away. Join thousands of winners today!"
      },
      "raffle": {
        "buy_number": "Buy Number",
        "price": "Price",
        "total": "Total Numbers",
        "sold": "Sold",
        "draw_date": "Draw Date",
        "prize": "Prize",
        "progress": "Progress",
        "win_msg": "Congratulations! You won {{amount}} Kz",
        "lose_msg": "No instant prize, but you are in the draw!"
      },
      "dashboard": {
        "balance": "Balance",
        "my_numbers": "My Numbers",
        "notifications": "Notifications"
      }
    }
  },
  pt: {
    translation: {
      "nav": {
        "home": "Início",
        "raffles": "Rifas",
        "dashboard": "Painel",
        "admin": "Admin",
        "login": "Entrar",
        "register": "Registar",
        "logout": "Sair"
      },
      "home": {
        "hero_title": "Ganhe Grande com a RifaAngola",
        "hero_subtitle": "A plataforma de rifas mais transparente e emocionante de Angola.",
        "cta": "Explorar Rifas",
        "how_it_works": "Como Funciona",
        "step1": "Escolha uma Rifa",
        "step2": "Compre um Número",
        "step3": "Ganhe Prémios",
        "motivational": "A sua sorte está a apenas um clique de distância. Junte-se a milhares de vencedores hoje!"
      },
      "raffle": {
        "buy_number": "Comprar Número",
        "price": "Preço",
        "total": "Total de Números",
        "sold": "Vendidos",
        "draw_date": "Data do Sorteio",
        "prize": "Prémio",
        "progress": "Progresso",
        "win_msg": "Parabéns! Ganhou {{amount}} Kz",
        "lose_msg": "Não ganhou prémio imediato, mas continua no sorteio!"
      },
      "dashboard": {
        "balance": "Saldo",
        "my_numbers": "Meus Números",
        "notifications": "Notificações"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
