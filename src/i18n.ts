import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
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
        "hero_title": "Ganhe Grande com a RIFASANGOLA",
        "hero_tagline": "FÁBIO REVOADA 046",
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
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
