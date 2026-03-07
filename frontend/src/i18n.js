import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enTranslations from "./locales/en/translation.json"
import zhTwTranslations from "./locales/zh-TW/translation.json"

const resources = {
  en: { translation: enTranslations },
  "zh-TW": { translation: zhTwTranslations },
}

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
