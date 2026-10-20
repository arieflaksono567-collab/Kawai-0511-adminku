import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

async function startServer() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);
  app.use(express.json());

  // Backend API Routes
  app.post('/api/orders', async (req, res) => {
    const { service_type_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address } = req.body;
    const authHeader = req.headers.authorization;

    if (!service_type_id || !pickup_address || !dropoff_address || !authHeader) {
      return res.status(400).json({ error: 'Missing required fields or authentication' });
    }

    try {
      // 1. Verify Authentication
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const customer_id = user.id;

      // 2. Fetch tariff rules
      const { data: rules, error: rulesError } = await supabase
        .from('tariff_rules')
        .select('*')
        .eq('service_type_id', service_type_id)
        .eq('status', 'active')
        .maybeSingle();

      if (rulesError || !rules) {
        return res.status(404).json({ error: 'Tariff rules not found or inactive' });
      }

      // 3. Tariff Calculation (Gated by Routing Configuration)
      if (!process.env.ROUTING_API_KEY) {
        return res.status(503).json({ error: 'Routing service not configured' });
      }
      
      const distance = 3.4; // Placeholder
      const fare = rules.base_fare_idr + Math.max(0, distance - Number(rules.included_distance_km)) * rules.fare_per_km_idr;
      const calculation_details = {
        rule_id: rules.id,
        rule_version: rules.version,
        base_fare: rules.base_fare_idr,
        included_km: rules.included_distance_km,
        fare_per_km: rules.fare_per_km_idr,
        distance,
        fare: Math.max(fare, rules.minimum_fare_idr)
      };

      // 4. Order Insertion with Snapshot
      const { data: order, error: insertError } = await supabase
        .from('orders')
        .insert([{
          customer_id,
          service_type_id,
          pickup_address,
          pickup_lat,
          pickup_lng,
          dropoff_address,
          dropoff_lat,
          dropoff_lng,
          estimated_distance_km: distance,
          estimated_fare_idr: calculation_details.fare,
          tariff_version: rules.version.toString(),
          calculation_details: calculation_details
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(200).json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });


  // Frontend Fallback
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
