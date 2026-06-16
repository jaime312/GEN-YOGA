const SUPA_URL = 'https://jkjifmrrlyncuwpjhxvk.supabase.co';
const SUPA_KEY = 'sb_publishable_xnIELom1ouXaBDJNYaWDAQ_VJNjlnIK';

async function run() {
    try {
        const res = await fetch(`${SUPA_URL}/rest/v1/profiles?select=saldo_psicologia,saldo_nutricion&limit=1`, {
            headers: {
                'apikey': SUPA_KEY,
                'Authorization': `Bearer ${SUPA_KEY}`
            }
        });
        const data = await res.json();
        console.log("Response:", res.status, data);
    } catch(e) {
        console.log("Error:", e);
    }
}
run();
