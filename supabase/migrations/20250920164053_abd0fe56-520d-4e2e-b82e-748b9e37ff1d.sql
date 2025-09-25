-- Create storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicles', 'vehicles', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for vehicle images
CREATE POLICY "Vehicle images are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicles');

CREATE POLICY "Service staff can upload vehicle images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehicles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Service staff can update vehicle images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'vehicles' AND auth.uid() IS NOT NULL);

CREATE POLICY "Service staff can delete vehicle images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'vehicles' AND auth.uid() IS NOT NULL);