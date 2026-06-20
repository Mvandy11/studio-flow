-- Allow the admin account to delete any submission
CREATE POLICY "Admin can delete any submission"
ON submissions
FOR DELETE
USING (
  auth.email() = 'obviouslyinspiredstudio@outlook.com'
);
