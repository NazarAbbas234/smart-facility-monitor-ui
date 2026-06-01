import { QueryRowFormat } from "@itwin/core-common";
import { IModelConnection } from "@itwin/core-frontend";
import { XYZ } from "@itwin/core-geometry";

// Smart Device object.
export interface SmartDevice {
    id: string;
    smartDeviceId: string;
    smartDeviceType: string;
    origin: XYZ;
}

export class IModelDataApi {
    // Method for fetching Smart Device properties.
    public static async getSmartDevices(iModel: IModelConnection | undefined): Promise<SmartDevice[]> {
        if (!iModel) {
            console.warn("📡 IModelDataApi: No active iModel connection provided yet.");
            return [];
        }
        // Our query.
        const query = `
            SELECT  ECInstanceId, SmartDeviceId, SmartDeviceType, Origin
                FROM DgnCustomItemTypes_HouseSchema.SmartDevice
                WHERE Origin IS NOT NULL
        `;

        // Get the IModelConnection
        try {
            const results = iModel.createQueryReader(query, undefined, {
                rowFormat: QueryRowFormat.UseJsPropertyNames,
            });

            return await results.toArray();
            } catch (error) {
                console.error("❌ Failed to execute ECSQL SmartDevice Query:", error);
                return [];
            }
    }
}