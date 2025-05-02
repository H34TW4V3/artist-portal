import React, { useState } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { getUserProfileByEmail } from "@/services/user"; // Ensure this is correct

// Define the type of the user profile you're fetching
interface UserProfile {
  name: string;
  email: string;
  bio?: string | null;
  phoneNumber?: string | null;
  imageUrl?: string | null;
}

const LoginForm = () => {
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [enteredEmail, setEnteredEmail] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, getValues } = useForm();

  const STEPS = ["Step 1", "Step 2", "Step 3"];
  const [currentStep, setCurrentStep] = useState<number>(0);

  const validateStep = async (step: number) => {
    return true;
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const onSubmit = (data: any) => {
    console.log("Form submitted with data:", data);
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep === 1) {
        const email = getValues("artistId");
        setEnteredEmail(email); 

        setIsFetchingProfile(true);
        setProfileData(null);
        try {
          const result = await getUserProfileByEmail(email);

          if (result && result.name) {
            setProfileData(result);
            console.log("Fetched profile:", result);
          } else {
            console.warn("User not found for email:", email);
            setProfileData(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setProfileData(null);
        } finally {
          setIsFetchingProfile(false);
          goToStep(currentStep + 1);
        }
      } else if (currentStep < STEPS.length) {
        goToStep(currentStep + 1);
      } else {
        await handleSubmit(onSubmit)();
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email field */}
        <input
          {...register("artistId", { required: "Email is required" })}
          placeholder="Enter your email"
        />
        {/* Error handling */}
        {errors.artistId && (
          <span>{(errors.artistId as FieldError).message}</span>
        )}

        <button type="button" onClick={handleNext}>
          {currentStep === STEPS.length ? 'Submit' : 'Next'}
        </button>
      </form>

      {isFetchingProfile && <p>Loading profile...</p>}

      {profileData && (
        <div>
          <h3>Profile Details:</h3>
          <p>Name: {profileData.name}</p>
          <p>Email: {profileData.email}</p>
          {profileData.bio && <p>Bio: {profileData.bio}</p>}
          {profileData.phoneNumber && <p>Phone: {profileData.phoneNumber}</p>}
          {profileData.imageUrl && <img src={profileData.imageUrl} alt="Profile" />}
        </div>
      )}
    </div>
  );
};

export default LoginForm;
