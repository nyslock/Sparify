
// Sicherheitsschlüssel für die Verschlüsselung
const SECRET_KEY_STRING = 'SPARIFY_SECURE_KEY_v1';

const str2ab = (str: string) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};

const getKey = async () => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    str2ab(SECRET_KEY_STRING),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: str2ab("SPARIFY_SALT"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptAmount = async (amount: number): Promise<string> => {
  try {
    const key = await getKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = str2ab(amount.toString());

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    const ivArray = Array.from(iv);
    const contentArray = Array.from(new Uint8Array(encryptedContent));
    
    const ivBase64 = btoa(String.fromCharCode.apply(null, ivArray));
    const contentBase64 = btoa(String.fromCharCode.apply(null, contentArray));

    return `${ivBase64}:${contentBase64}`;
  } catch (e) {
    console.error("Encryption failed", e);
    return amount.toString(); // Fallback auf String-Zahl
  }
};

export const decryptAmount = async (encryptedString: any): Promise<number> => {
  if (encryptedString === null || encryptedString === undefined) return 0;
  
  // Falls es bereits eine Zahl ist
  if (typeof encryptedString === 'number') return encryptedString;

  try {
    const strValue = String(encryptedString);
    
    // Fallback für unverschlüsselte Daten (kein Doppelpunkt vorhanden)
    if (!strValue.includes(':')) {
        const simpleNum = parseFloat(strValue);
        return isNaN(simpleNum) ? 0 : simpleNum;
    }

    const [ivBase64, contentBase64] = strValue.split(':');
    if (!ivBase64 || !contentBase64) return 0;

    const key = await getKey();
    
    let ivString, contentString;
    try {
        ivString = atob(ivBase64);
        contentString = atob(contentBase64);
    } catch (base64Err) {
        // Nicht valides Base64 -> Wahrscheinlich Klartext
        const fallbackNum = parseFloat(strValue);
        return isNaN(fallbackNum) ? 0 : fallbackNum;
    }

    const iv = new Uint8Array(ivString.length);
    for (let i = 0; i < ivString.length; i++) iv[i] = ivString.charCodeAt(i);

    const content = new Uint8Array(contentString.length);
    for (let i = 0; i < contentString.length; i++) content[i] = contentString.charCodeAt(i);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      content
    );

    const dec = new TextDecoder();
    const decryptedString = dec.decode(decryptedBuffer);
    const result = parseFloat(decryptedString);
    return isNaN(result) ? 0 : result;

  } catch (e) {
    console.warn("Decryption failed, using fallback parsing", e);
    const fallback = parseFloat(String(encryptedString));
    return isNaN(fallback) ? 0 : fallback;
  }
};
