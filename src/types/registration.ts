export type Resident = {
  name: string;
  email: string;
};

export type RegistrationData = {
  houseNumber: string;
  residents: Resident[];
};
