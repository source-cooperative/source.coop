"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const website = formData.get("website") as string;
    const email = formData.get("email") as string;
    const owner_account_id = formData.get("owner_account_id") as string;

    if (!name || !description || !owner_account_id) {
      throw new Error("Missing required fields");
    }

    // TODO: Replace with actual organization creation logic
    // This would typically call your API or database functions
    console.log("Creating organization:", {
      name,
      description,
      website,
      email,
      owner_account_id,
    });

    // For now, just redirect back to the owner's account page
    // In a real implementation, you'd create the organization and redirect to it
    revalidatePath(`/${owner_account_id}`);
    redirect(`/${owner_account_id}`);
  } catch (error) {
    console.error("Error creating organization:", error);
    // In a real implementation, you'd handle errors more gracefully
    throw error;
  }
}
