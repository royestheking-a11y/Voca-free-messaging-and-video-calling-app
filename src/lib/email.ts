
import emailjs from '@emailjs/browser';

// Credentials provided by user
const SERVICE_ID = 'service_pdy4aj9';
const PUBLIC_KEY = 'vH5ETq1rrml5QIfa1';
const REGISTRATION_TEMPLATE_ID = 'template_5ujwdcn';
const RESET_TEMPLATE_ID = 'template_xi336s9';

// Initialize EmailJS
export const initEmail = () => {
    emailjs.init(PUBLIC_KEY);
};

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendRegistrationOTP = async (email: string, otp: string, name: string) => {
    try {
        const templateParams = {
            to_email: email,
            to_name: name,
            OTP_CODE: otp,
            reply_to: 'support@voca.app'
        };

        const response = await emailjs.send(SERVICE_ID, REGISTRATION_TEMPLATE_ID, templateParams);
        return { success: true, response };
    } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false, error };
    }
};

export const sendPasswordResetOTP = async (email: string, otp: string) => {
    try {
        const templateParams = {
            to_email: email,
            to_name: 'Voca User', // Generic name for reset
            OTP_CODE: otp,
            reply_to: 'support@voca.app'
        };

        const response = await emailjs.send(SERVICE_ID, RESET_TEMPLATE_ID, templateParams);
        return { success: true, response };
    } catch (error) {
        console.error('EmailJS Error:', error);
        return { success: false, error };
    }
};
