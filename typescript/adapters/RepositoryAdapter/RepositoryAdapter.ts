import type { ISaveRepository, GlobalProgressData } from "../../domain/ports/ISaveRepository";

export class RepositoryAdapter implements ISaveRepository {
    private readonly SAVE_KEY = 'geppetto_dream_save';
    
    //? Palavra-chave usada para o Cipher XOR para desencorajar adulteração casual de save local.
    private readonly SECRET = 'G3p3tt0_Dr34ms_V1_2026';

    private encrypt(data: string): string {
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ this.SECRET.charCodeAt(i % this.SECRET.length));
        }
        return btoa(result); //? Converte o buffer cifrado para Base64 garantindo caracteres ASCII legíveis e portáveis.
    }

    private decrypt(data: string): string {
        const decoded = atob(data);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ this.SECRET.charCodeAt(i % this.SECRET.length));
        }
        return result;
    }

    public async saveProgress(data: GlobalProgressData): Promise<void> {
        try {
            const serialized = JSON.stringify(data);
            const encrypted = this.encrypt(serialized);
            localStorage.setItem(this.SAVE_KEY, encrypted);
        } catch (error) {
            console.error("Failed to encrypt and save progress", error);
        }
    }

    public async loadProgress(): Promise<GlobalProgressData | null> {
        try {
            const encrypted = localStorage.getItem(this.SAVE_KEY);
            if (!encrypted) return null;
            const decrypted = this.decrypt(encrypted);
            return JSON.parse(decrypted) as GlobalProgressData;
        } catch (error) {
            console.error("Failed to decrypt and load progress. Save might be corrupted or tampered.", error);
            return null;
        }
    }

    /** Retorna a string pura e encriptada (Base64) para o jogador copiar e guardar. */
    public exportSave(): string | null {
        return localStorage.getItem(this.SAVE_KEY);
    }

    /** Valida e tenta decriptar a string informada. Se for válida, injeta no Storage. */
    public importSave(encryptedData: string): boolean {
        try {
            const decrypted = this.decrypt(encryptedData);
            JSON.parse(decrypted); //? Valida a integridade do JSON decifrado para confirmar paridade com a chave XOR.
            localStorage.setItem(this.SAVE_KEY, encryptedData);
            return true;
        } catch (e) {
            return false;
        }
    }
}