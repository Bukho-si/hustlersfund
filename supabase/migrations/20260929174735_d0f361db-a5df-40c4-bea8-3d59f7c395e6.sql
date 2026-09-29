SELECT cron.unschedule('apply-monthly-interest-daily');
SELECT cron.schedule('apply-monthly-interest-daily', '0 2 * * *', $$SELECT public.accrue_personal_loan_interest();$$);