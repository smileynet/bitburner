for (const cityName of['Aevum', 'Chongqing', 'Sector-12', 'New Tokyo', 'Ishima', 'Volhaven']) {
    const office = corp.getOffice(division, cityName);
    if (office.employees.length === office.size) continue;
    for (let i = office.employees.length; i < office.size; i++) corp.hireEmployee(division, cityName);
    await corp.setAutoJobAssignment(division, cityName, 'Operations', 0);
    await corp.setAutoJobAssignment(division, cityName, 'Engineer', 0);
    await corp.setAutoJobAssignment(division, cityName, 'Business', 0);
    await corp.setAutoJobAssignment(division, cityName, 'Management', 0);
    await corp.setAutoJobAssignment(division, cityName, 'Research & Development', 0);
    const val = office.size / 15;
    await corp.setAutoJobAssignment(division, cityName, 'Operations', Math.floor(val * 2));
    await corp.setAutoJobAssignment(division, cityName, 'Engineer', Math.floor(val * 6));
    await corp.setAutoJobAssignment(division, cityName, 'Business', Math.floor(val * 2));
    await corp.setAutoJobAssignment(division, cityName, 'Management', Math.floor(val * 2));
    await corp.setAutoJobAssignment(division, cityName, 'Research & Development', Math.floor(val * 3));
}