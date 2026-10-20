/*
 * Conexión con la base de datos en la nube (Supabase).
 *
 * Completá estos dos datos con los de tu proyecto (Supabase → Project Settings):
 *   - supabaseUrl: "Project URL", por ejemplo https://abcdefghijkl.supabase.co
 *   - supabaseAnonKey: la clave pública, "publishable" (sb_publishable_…) o "anon public".
 *     NUNCA pongas acá la clave "secret" ni la "service_role".
 *
 * La clave pública puede estar a la vista: los datos están protegidos por las reglas
 * de seguridad de supabase/esquema.sql, que solo dejan entrar a usuarios autorizados.
 *
 * Si los dejás vacíos, la app funciona sin nube (datos guardados en cada dispositivo),
 * o se puede conectar desde Ajustes → Base de datos en la nube.
 */
window.KF_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
