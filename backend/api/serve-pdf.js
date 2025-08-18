const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const router = express.Router();

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Serve PDF endpoint
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { authorization } = req.headers;

    // Verify user authentication
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authorization.split(' ')[1];
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get the health record and verify ownership
    const { data: record, error: recordError } = await supabase
      .from('health_records')
      .select(`
        id,
        profile_id,
        attachment_url,
        profiles!inner(user_id)
      `)
      .eq('id', recordId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Verify the user owns the profile
    if (record.profiles.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!record.attachment_url) {
      return res.status(404).json({ error: 'No PDF attached to this record' });
    }

    // Extract file path from attachment_url
    let filePath = record.attachment_url;
    
    // If it's a public URL, extract the file path
    if (record.attachment_url.includes('/storage/v1/object/public/')) {
      const urlParts = record.attachment_url.split('/storage/v1/object/public/');
      if (urlParts.length > 1) {
        filePath = urlParts[1];
      }
    }

    // Remove bucket name from file path if it's included
    if (filePath.startsWith('reports/')) {
      filePath = filePath.substring(8); // Remove 'reports/' prefix
    }

    console.log('Attempting to generate signed URL for file path:', filePath);

    // Generate a signed URL with service role (more reliable)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('reports')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      console.error('File path that failed:', filePath);
      console.error('Record attachment_url:', record.attachment_url);
      
      // Check if file exists in storage
      const { data: fileExists, error: listError } = await supabase.storage
        .from('reports')
        .list(filePath.split('/').slice(0, -1).join('/'));
      
      if (listError) {
        console.error('Error listing files in directory:', listError);
      } else {
        console.log('Files in directory:', fileExists);
      }
      
      return res.status(500).json({ 
        error: 'Failed to generate access URL',
        details: signedUrlError.message,
        filePath: filePath
      });
    }

    // Return the signed URL
    res.json({ 
      signedUrl: signedUrlData.signedUrl,
      fileName: filePath.split('/').pop(),
      recordId: record.id
    });

  } catch (error) {
    console.error('Serve PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
